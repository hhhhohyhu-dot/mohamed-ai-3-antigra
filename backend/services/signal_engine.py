from services.risk_engine import calculate_risk

def generate_strict_signal(indicators: dict, ai_confidence: int, entry: float, sl: float, tp: float, symbol: str = "") -> dict:
    """
    Generates a strict trading signal enforcing all institutional rules.
    """
    # Detect if Forex symbol to bypass volume surge confirmation (OTC market lacks reliable central volume)
    is_forex = False
    if symbol:
        symbol_upper = symbol.upper().strip()
        is_forex = symbol_upper.endswith("=X") or (len(symbol_upper) == 6 and symbol_upper.isalpha()) or "/" in symbol_upper or "-" in symbol_upper

    # 1. Trend
    trend_strong = indicators.get("Trend_Strength") in ["Strong", "Very Strong"]
    
    # 2. Liquidity
    liquidity_present = indicators.get("Liquidity_Top_Present") or indicators.get("Liquidity_Bottom_Present")
    
    # 3. Structure
    structure_clear = indicators.get("Market_Structure") in ["Bullish (HH/HL)", "Bearish (LH/LL)"]
    
    # 4. ICT/SMC confirmed
    smc_confirmed = indicators.get("Bullish_OB") or indicators.get("Bearish_OB") or indicators.get("FVG_Present") or indicators.get("Breaker_Block") or indicators.get("Mitigation_Block")
    
    # 5. Volume Confirmed (Bypassed for Forex since volume is decentralised / unavailable)
    volume_confirmed = True if is_forex else indicators.get("Volume_Surge")
    
    # 6. AI Confidence >= 90%
    ai_confirmed = ai_confidence >= 90
    
    # 7. Risk Engine
    risk_evaluation = calculate_risk(entry=entry, stop_loss=sl, take_profit=tp)
    
    reasons = []
    if not trend_strong: reasons.append("Trend not strong.")
    if not liquidity_present: reasons.append("No liquidity sweep detected.")
    if not structure_clear: reasons.append("Market structure not clear.")
    if not smc_confirmed: reasons.append("No ICT/SMC confirmation (OB/FVG).")
    if not volume_confirmed: reasons.append("No volume surge.")
    if not ai_confirmed: reasons.append(f"AI confidence too low ({ai_confidence}% < 90%).")
    if not risk_evaluation["approved"]: reasons.append(risk_evaluation["reason"])
    
    approved = len(reasons) == 0
    
    return {
        "signal": "APPROVED" if approved else "NO TRADE",
        "reasons_for_rejection": reasons,
        "risk_evaluation": risk_evaluation,
        "ai_confidence": ai_confidence,
        "is_forex_bypassed_volume": is_forex
    }
