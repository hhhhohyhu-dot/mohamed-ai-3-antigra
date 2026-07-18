from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.ai_service import generate_trading_plan
from services.signal_engine import generate_strict_signal

router = APIRouter()

class AnalyzeRequest(BaseModel):
    symbol: str
    indicators: Dict[str, Any]
    capital: Optional[float] = None

@router.post("/")
def post_analyze(request: AnalyzeRequest):
    analysis = generate_trading_plan(request.symbol, request.indicators, request.capital)
    
    # Enforce strict institutional rules via Signal Engine
    if analysis.get("signal") in ["Buy", "Sell"] and analysis.get("plan"):
        plan = analysis["plan"]
        entry = plan.get("entry", 0)
        sl = plan.get("sl", 0)
        tp = plan.get("tp1", 0)
        
        # Extract confidence from forecast
        confidence = 0
        forecast = analysis.get("forecast", {})
        tomorrow = forecast.get("tomorrow", {})
        if isinstance(tomorrow, dict):
            confidence = tomorrow.get("confidence", 0)
            
        strict_evaluation = generate_strict_signal(
            indicators=request.indicators,
            ai_confidence=confidence,
            entry=entry,
            sl=sl,
            tp=tp
        )
        
        # Override AI if rules are not met
        if strict_evaluation["signal"] == "NO TRADE":
            analysis["original_signal"] = analysis.get("signal")
            analysis["signal"] = "NO TRADE"
            analysis["explanation"] = "TRADE REJECTED BY RISK ENGINE. " + " ".join(strict_evaluation["reasons_for_rejection"])
            analysis["plan"] = None
            
        analysis["strict_evaluation"] = strict_evaluation

    return {"symbol": request.symbol, "analysis": analysis}
