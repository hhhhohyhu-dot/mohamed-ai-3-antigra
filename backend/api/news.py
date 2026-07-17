from fastapi import APIRouter
from services.data_service import get_news as fetch_news

router = APIRouter()

@router.get("/{symbol}")
def get_news(symbol: str):
    news = fetch_news(symbol)
    return {"symbol": symbol, "news": news}
