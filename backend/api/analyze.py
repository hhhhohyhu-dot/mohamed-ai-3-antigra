from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.ai_service import generate_trading_plan
from services.signal_engine import generate_strict_signal, calculate_technical_score
from services.indicator_service import calculate_mtf_indicators, calculate_indicators
from services.macro_service import get_macro_data
from services.data_service import get_historical_data

router = APIRouter()

class AnalyzeRequest(BaseModel):
    symbol: str
    indicators: Dict[str, Any]
    capital: Optional[float] = None

@router.post("/")
def post_analyze(request: AnalyzeRequest):
    # --- Load MTF data (cached 5min) ---
    try:
        mtf_data = calculate_mtf_indicators(request.symbol)
    except Exception:
        mtf_data = None

    # --- Build condensed macro context for the LLM ---
    macro_context = None
    try:
        raw_macro = get_macro_data()
        stress = raw_macro.get("stress_index", {})
        indicators_macro = raw_macro.get("indicators", {})
        vix_data = indicators_macro.get("VIX", {})
        dxy_data = indicators_macro.get("DXY", {})
        divergences = raw_macro.get("divergences", [])
        macro_context = {
            "stress_value": stress.get("value", 50),
            "stress_regime": stress.get("regime", "NEUTRAL"),
            "vix_zscore": vix_data.get("z_score", 0),
            "dxy_momentum": "Bullish" if dxy_data.get("momentum_score", 0) > 0 else "Bearish",
            "divergence_count": len(divergences),
        }
    except Exception:
        macro_context = None

    # --- Generate AI trading plan with full context ---
    analysis = generate_trading_plan(
        request.symbol,
        request.indicators,
        request.capital,
        mtf_data=mtf_data,
        macro_context=macro_context
    )

    # Enforce strict institutional rules via Signal Engine
    if analysis.get("signal") in ["Buy", "Sell"] and analysis.get("plan"):
        plan = analysis["plan"]
        entry = plan.get("entry", 0)
        sl = plan.get("sl", 0)
        tp = plan.get("tp1", 0)

        # Extract confidence from AI confidence_score or forecast
        confidence = analysis.get("confidence_score", 0)
        if not confidence:
            forecast = analysis.get("forecast", {})
            tomorrow = forecast.get("tomorrow", {})
            if isinstance(tomorrow, dict):
                confidence = tomorrow.get("confidence", 0)

        strict_evaluation = generate_strict_signal(
            indicators=request.indicators,
            ai_confidence=confidence,
            entry=entry,
            sl=sl,
            tp=tp,
            symbol=request.symbol
        )

        # Override AI if rules are not met
        if strict_evaluation["signal"] == "NO TRADE":
            analysis["original_signal"] = analysis.get("signal")
            analysis["signal"] = "NO TRADE"
            analysis["explanation"] = "TRADE REJECTED BY RISK ENGINE. " + " ".join(strict_evaluation["reasons_for_rejection"])
            analysis["plan"] = None

        analysis["strict_evaluation"] = strict_evaluation

    # Attach MTF data to response so frontend can display it
    if mtf_data:
        analysis["mtf"] = {
            "weekly": mtf_data.get("weekly", {}),
            "daily": mtf_data.get("daily", {}),
            "h4": mtf_data.get("h4", {}),
            "alignment_score": mtf_data.get("alignment_score", 0),
            "bearish_count": mtf_data.get("bearish_count", 0),
            "weekly_trend": mtf_data.get("weekly_trend", "Unknown"),
            "daily_trend": mtf_data.get("daily_trend", "Unknown"),
            "h4_trend": mtf_data.get("h4_trend", "Unknown"),
        }

    return {"symbol": request.symbol, "analysis": analysis}


SCANNED_ASSETS = [
    "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCAD=X", "AUDUSD=X",
    "BTC-USD", "ETH-USD", "GC=F", "^GSPC"
]

@router.get("/top-opportunity")
def get_top_opportunity():
    """
    Scans a set of forex, crypto, and commodity assets.
    Returns the asset with the highest technical score conviction.
    """
    best_symbol = None
    best_score = 50
    best_signal = "Hold"
    best_price = 0.0
    max_strength = -1  # Set to -1 to allow pick even if slight conviction

    for symbol in SCANNED_ASSETS:
        try:
            df = get_historical_data(symbol, period="1mo", interval="1d")
            if df.empty or len(df) < 15:
                continue

            indicators = calculate_indicators(df)
            latest_price = float(df.iloc[-1]['close'])
            
            scoring_indicators = indicators.copy()
            scoring_indicators["close"] = latest_price

            score = calculate_technical_score(scoring_indicators, symbol)
            strength = abs(score - 50)

            if score >= 72:
                signal = "Strong Buy" if score >= 88 else "Buy"
            elif score <= 30:
                signal = "Strong Sell" if score <= 12 else "Sell"
            else:
                signal = "Hold"

            # Re-evaluate logic: even if it is a "Hold", if it's the strongest relative deviation, we can pick it
            if strength > max_strength:
                max_strength = strength
                # Clean up symbol for frontend UI
                best_symbol = symbol.replace("=X", "")
                best_score = score
                best_signal = signal
                best_price = latest_price
        except Exception as e:
            print(f"Error scanning {symbol}: {e}")
            continue

    if not best_symbol:
        best_symbol = "EURUSD"
        best_score = 50
        best_signal = "Hold"
        best_price = 1.0823

    return {
        "symbol": best_symbol,
        "score": best_score,
        "signal": best_signal,
        "price": best_price
    }
