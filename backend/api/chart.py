from fastapi import APIRouter
from services.data_service import get_historical_data
from services.indicator_service import calculate_indicators

router = APIRouter()

@router.get("/{symbol}")
def get_chart(symbol: str):
    df = get_historical_data(symbol, period="1y", interval="1d") # 1y to have enough data for EMA200
    if df.empty:
        return {"error": "No data found for symbol"}
    
    # Calculate indicators to overlay
    import pandas_ta as ta
    import pandas as pd
    
    df_calc = df.copy()
    if 'time' in df_calc.columns:
        df_calc['datetime'] = pd.to_datetime(df_calc['time'])
        df_calc.set_index('datetime', inplace=True)

    df_calc['EMA20'] = ta.ema(df_calc['close'], length=20)
    df_calc['EMA50'] = ta.ema(df_calc['close'], length=50)
    df_calc['EMA100'] = ta.ema(df_calc['close'], length=100)
    df_calc['EMA200'] = ta.ema(df_calc['close'], length=200)
    
    vwap = ta.vwap(df_calc['high'], df_calc['low'], df_calc['close'], df_calc['volume'])
    if vwap is not None and not vwap.empty:
        df_calc['VWAP'] = vwap
        
    bbands = ta.bbands(df_calc['close'])
    if bbands is not None and not bbands.empty:
        df_calc['BB_upper'] = bbands.iloc[:, 2]
        df_calc['BB_lower'] = bbands.iloc[:, 0]
        
    # Merge back calculated cols into df
    for col in ['EMA20', 'EMA50', 'EMA100', 'EMA200', 'VWAP', 'BB_upper', 'BB_lower']:
        if col in df_calc.columns:
            df[col] = df_calc[col].values
            # replace nans with None
            df[col] = df[col].apply(lambda x: None if pd.isna(x) else x)

    # Return as list of dictionaries
    data = df.to_dict(orient="records")
    return {"symbol": symbol, "data": data}
