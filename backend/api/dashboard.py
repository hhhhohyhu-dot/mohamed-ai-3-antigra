from fastapi import APIRouter
from services.data_service import get_historical_data, get_news
from services.indicator_service import calculate_indicators
from services.ai_service import analyze_sentiment

router = APIRouter()

@router.get("/{symbol}")
def get_dashboard(symbol: str):
    df = get_historical_data(symbol, period="1mo", interval="1d")
    
    current_price = 0
    change = 0
    change_percent = 0
    
    if not df.empty and len(df) >= 2:
        current_price = df.iloc[-1]['close']
        prev_price = df.iloc[-2]['close']
        change = current_price - prev_price
        change_percent = (change / prev_price) * 100
        
    return {
        "symbol": symbol,
        "price": current_price,
        "change": change,
        "change_percent": change_percent
    }
