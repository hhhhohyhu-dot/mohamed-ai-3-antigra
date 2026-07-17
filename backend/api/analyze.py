from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from services.ai_service import generate_trading_plan

router = APIRouter()

class AnalyzeRequest(BaseModel):
    symbol: str
    indicators: Dict[str, Any]

@router.post("/")
def post_analyze(request: AnalyzeRequest):
    analysis = generate_trading_plan(request.symbol, request.indicators)
    return {"symbol": request.symbol, "analysis": analysis}
