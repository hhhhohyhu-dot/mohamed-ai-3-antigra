from fastapi import APIRouter
from services.data_service import get_historical_data
from services.indicator_service import calculate_indicators

router = APIRouter()

@router.get("/{symbol}")
def get_indicators(symbol: str):
    # Daily Data
    df_daily = get_historical_data(symbol, period="2y", interval="1d")
    if df_daily.empty:
        return {"error": "No daily data found"}
    
    indicators = calculate_indicators(df_daily)

    # Weekly Data for MTF Confirmation
    df_weekly = get_historical_data(symbol, period="5y", interval="1wk")
    if not df_weekly.empty and len(df_weekly) > 20:
        weekly_indicators = calculate_indicators(df_weekly)
        
        # Simple weekly trend logic:
        # If Weekly EMA20 > EMA50 and Close > EMA20 -> Strong Bullish MTF
        # Else if Weekly EMA20 < EMA50 and Close < EMA20 -> Strong Bearish MTF
        weekly_trend = "Neutral"
        w_ema20 = weekly_indicators.get("EMA20")
        w_ema50 = weekly_indicators.get("EMA50")
        w_close = df_weekly.iloc[-1]["close"]
        
        if w_ema20 and w_ema50:
            if w_ema20 > w_ema50 and w_close > w_ema20:
                weekly_trend = "Bullish"
            elif w_ema20 < w_ema50 and w_close < w_ema20:
                weekly_trend = "Bearish"
        
        indicators["MTF_Trend_Weekly"] = weekly_trend
    else:
        indicators["MTF_Trend_Weekly"] = "Unknown"

    return {"symbol": symbol, "indicators": indicators}
