import yfinance as yf
import pandas as pd

def get_historical_data(symbol: str, period: str = "1mo", interval: str = "1d") -> pd.DataFrame:
    """
    Fetches historical OHLCV data using yfinance.
    """
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

def get_news(symbol: str):
    """
    Fetches latest news for the symbol using yfinance.
    """
    ticker = yf.Ticker(symbol)
    news = ticker.news
    return news
