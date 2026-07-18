from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.ai_service import generate_trading_plan

router = APIRouter()

class AnalyzeRequest(BaseModel):
    symbol: str
    indicators: Dict[str, Any]
    capital: Optional[float] = None

@router.post("/")
def post_analyze(request: AnalyzeRequest):
    analysis = generate_trading_plan(request.symbol, request.indicators, request.capital)
    return {"symbol": request.symbol, "analysis": analysis}
