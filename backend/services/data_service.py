import yfinance as yf
import pandas as pd
import time
from functools import wraps

_cache = {}

def ttl_cache(ttl_seconds=60):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = (func.__name__, args, frozenset(kwargs.items()))
            if key in _cache:
                result, timestamp = _cache[key]
                if time.time() - timestamp < ttl_seconds:
                    return result.copy() if isinstance(result, pd.DataFrame) else result
            
            result = func(*args, **kwargs)
            _cache[key] = (result, time.time())
            return result.copy() if isinstance(result, pd.DataFrame) else result
        return wrapper
    return decorator

# Known crypto tickers that need -USD suffix on Yahoo Finance
CRYPTO_SYMBOLS = {
    "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "DOT",
    "MATIC", "LINK", "UNI", "ATOM", "LTC", "BCH", "ALGO", "XLM",
    "VET", "ICP", "FIL", "TRX", "ETC", "NEAR", "APT", "ARB",
    "OP", "INJ", "SUI", "SEI", "PEPE", "SHIB", "FLOKI",
}

# Standard Forex pairs
FOREX_PAIRS = {
    "EURUSD", "USDJPY", "GBPUSD", "USDCAD", "USDCHF", "AUDUSD", "NZDUSD",
    "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURAUD", "EURCAD", "AUDCAD"
}

# Common broker aliases to Yahoo Finance symbols
ALIAS_MAPPING = {
    "XAUUSD": "GC=F",     # Gold
    "XAGUSD": "SI=F",     # Silver
    "USOIL": "CL=F",      # WTI Crude Oil
    "WTI": "CL=F",
    "UKOIL": "BZ=F",      # Brent Crude
    "BRENT": "BZ=F",
    "DXY": "DX-Y.NYB",    # Dollar Index
    "SPX": "^GSPC",       # S&P 500
    "US500": "^GSPC",
    "NDX": "^NDX",        # Nasdaq 100
    "US100": "^NDX",
    "NAS100": "^NDX",
    "US30": "^DJI",       # Dow Jones
    "DJI": "^DJI"
}

def normalize_symbol(symbol: str) -> str:
    """
    Normalizes a trading symbol for yfinance.
    - Crypto tickers (BTC, ETH, etc.) get '-USD' appended automatically.
    - Already suffixed symbols (BTC-USD, ETH-USD) are kept as-is.
    """
    symbol = symbol.upper().strip()
    # If it's a known alias, return mapped symbol
    if symbol in ALIAS_MAPPING:
        return ALIAS_MAPPING[symbol]

    # If it already has a suffix like -USD, -EUR, return as-is
    if "-" in symbol or "=" in symbol or "^" in symbol:
        return symbol
    # If it's a known crypto, append -USD
    if symbol in CRYPTO_SYMBOLS:
        return f"{symbol}-USD"
    # If it's a known forex pair or exactly 6 letters (standard forex format), append =X
    if symbol in FOREX_PAIRS or (len(symbol) == 6 and symbol.isalpha() and not symbol.endswith('X')):
        return f"{symbol}=X"
    return symbol

@ttl_cache(ttl_seconds=60)
def get_historical_data(symbol: str, period: str = "1mo", interval: str = "1d") -> pd.DataFrame:
    """
    Fetches historical OHLCV data using yfinance (Cached for 60 seconds).
    """
    symbol = normalize_symbol(symbol)
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval=interval)
    if df.empty:
        return df
    
    # yfinance returns timezone-aware index, let's make it naive or string format
    df.reset_index(inplace=True)
    
    # The datetime column could be 'Date' or 'Datetime'
    date_col = 'Date' if 'Date' in df.columns else 'Datetime'
    
    # Rename for consistency
    df = df.rename(columns={
        date_col: 'time',
        'Open': 'open',
        'High': 'high',
        'Low': 'low',
        'Close': 'close',
        'Volume': 'volume'
    })
    
    # Convert time to timestamp or string formatted as YYYY-MM-DD
    # Lightweight charts needs time as string "YYYY-MM-DD" or unix timestamp
    df['time'] = df['time'].apply(lambda x: x.strftime('%Y-%m-%d') if interval.endswith('d') else int(x.timestamp()))
    
    return df[['time', 'open', 'high', 'low', 'close', 'volume']]

@ttl_cache(ttl_seconds=300)
def get_news(symbol: str):
    """
    Fetches latest news for the symbol using yfinance (Cached for 5 minutes).
    """
    symbol = normalize_symbol(symbol)
    ticker = yf.Ticker(symbol)
    news = ticker.news
    return news

@ttl_cache(ttl_seconds=300)
def get_mtf_data(symbol: str) -> dict:
    """
    Fetches historical data across multiple timeframes for MTF analysis.
    Returns a dict with 'daily', 'weekly', and 'h4' DataFrames.
    Cached for 5 minutes to avoid hammering Yahoo Finance.
    """
    result = {}
    try:
        result['daily'] = get_historical_data(symbol, period="2y", interval="1d")
    except Exception:
        result['daily'] = pd.DataFrame()

    try:
        result['weekly'] = get_historical_data(symbol, period="5y", interval="1wk")
    except Exception:
        result['weekly'] = pd.DataFrame()

    try:
        # 4H data — use 60d period with 1h then resample, or just use 1h and aggregate
        # Yahoo Finance supports '1h' for up to 730 days
        sym_normalized = normalize_symbol(symbol)
        ticker = yf.Ticker(sym_normalized)
        df_1h = ticker.history(period="60d", interval="1h")
        if not df_1h.empty:
            df_1h.reset_index(inplace=True)
            date_col = 'Date' if 'Date' in df_1h.columns else 'Datetime'
            df_1h = df_1h.rename(columns={
                date_col: 'time',
                'Open': 'open',
                'High': 'high',
                'Low': 'low',
                'Close': 'close',
                'Volume': 'volume'
            })
            # Resample 1h -> 4h
            df_1h['time'] = pd.to_datetime(df_1h['time'], utc=True)
            df_1h.set_index('time', inplace=True)
            df_4h = df_1h[['open', 'high', 'low', 'close', 'volume']].resample('4h').agg({
                'open': 'first',
                'high': 'max',
                'low': 'min',
                'close': 'last',
                'volume': 'sum'
            }).dropna()
            df_4h.reset_index(inplace=True)
            df_4h['time'] = df_4h['time'].apply(lambda x: int(x.timestamp()))
            result['h4'] = df_4h
        else:
            result['h4'] = pd.DataFrame()
    except Exception:
        result['h4'] = pd.DataFrame()

    return result
