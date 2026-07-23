from fastapi import APIRouter
from services.data_service import get_news
from services.ai_service import analyze_sentiment

router = APIRouter()

@router.get("/{symbol}")
def get_sentiment(symbol: str):
    """
    Fetches news and returns per-article sentiment scores along with an overall score.
    Each article has: title, link, date, score (0-100), label, and reason.
    """
    news_items = get_news(symbol)
    sentiment = analyze_sentiment(news_items)
    return {"symbol": symbol, "sentiment": sentiment}
