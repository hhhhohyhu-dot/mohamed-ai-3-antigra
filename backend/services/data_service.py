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
