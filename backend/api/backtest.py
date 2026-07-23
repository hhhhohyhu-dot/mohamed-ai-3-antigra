from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.backtest_service import run_backtest_simulation
from services.ai_service import analyze_backtest

router = APIRouter()

class BacktestRequest(BaseModel):
    symbol: str
    strategy: str
    initial_capital: float = 10000.0
    parameters: dict = {}

@router.post("/run")
async def run_backtest(req: BacktestRequest):
    # Run the math simulation
    res = run_backtest_simulation(
        symbol=req.symbol,
        strategy=req.strategy,
        initial_capital=req.initial_capital,
        parameters=req.parameters
    )
    
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
        
    # Get the AI evaluation in background or synchronously
    ai_report = analyze_backtest(
        symbol=req.symbol,
        strategy=req.strategy,
        metrics=res,
        completed_trades=res["completed_trades"]
    )
    
    res["ai_report"] = ai_report
    return res
