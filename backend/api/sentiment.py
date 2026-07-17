from fastapi import APIRouter
from services.data_service import get_news
from services.ai_service import analyze_sentiment

router = APIRouter()

@router.get("/{symbol}")
def get_sentiment(symbol: str):
    news_items = get_news(symbol)
    sentiment = analyze_sentiment(news_items)
    return {"symbol": symbol, "sentiment": sentiment}
