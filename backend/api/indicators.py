from fastapi import APIRouter
from services.data_service import get_historical_data
from services.indicator_service import calculate_indicators, calculate_mtf_indicators

router = APIRouter()

@router.get("/{symbol}")
def get_indicators(symbol: str):
    """
    Returns full technical indicators for the symbol including:
    - Daily indicators (RSI, MACD, EMAs, SMC, CMF, Fibonacci, 12 candlestick patterns...)
    - Multi-Timeframe (MTF) analysis: Weekly, Daily, 4H trend with EMA/RSI/MACD breakdown
    """
    # Daily Data (primary timeframe)
    df_daily = get_historical_data(symbol, period="2y", interval="1d")
    if df_daily.empty:
        return {"error": "No daily data found"}
    
    indicators = calculate_indicators(df_daily)

    # Full MTF Analysis (Weekly + Daily + 4H)
    try:
        mtf = calculate_mtf_indicators(symbol)
        indicators["MTF"] = {
            "weekly": mtf.get("weekly", {}),
            "daily": mtf.get("daily", {}),
            "h4": mtf.get("h4", {}),
            "alignment_score": mtf.get("alignment_score", 0),
            "bearish_count": mtf.get("bearish_count", 0),
        }
        # Keep backward-compatible field
        indicators["MTF_Trend_Weekly"] = mtf.get("weekly_trend", "Unknown")
        indicators["MTF_Trend_Daily"] = mtf.get("daily_trend", "Unknown")
        indicators["MTF_Trend_4H"] = mtf.get("h4_trend", "Unknown")
    except Exception as e:
        indicators["MTF"] = None
        indicators["MTF_Trend_Weekly"] = "Unknown"
        indicators["MTF_Trend_Daily"] = "Unknown"
        indicators["MTF_Trend_4H"] = "Unknown"

    return {"symbol": symbol, "indicators": indicators}
