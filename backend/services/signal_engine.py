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


def calculate_technical_score(indicators: dict, symbol: str = "") -> int:
    """
    Calculates a technical confluence score (0-100) based on 12 key parameters.
    Replicates the React scoring logic in Python for real-time asset screening.
    """
    if not indicators:
        return 50

    score = 0
    
    # 1. EMA Trend Alignment
    ema20 = indicators.get("EMA20")
    ema50 = indicators.get("EMA50")
    ema100 = indicators.get("EMA100")
    ema200 = indicators.get("EMA200")
    close = indicators.get("close")
    
    if close and ema20 and ema50 and ema100 and ema200:
        if close > ema20 > ema50 > ema100 > ema200:
            score += 22
        elif close > ema50 and ema50 > ema200:
            score += 15
        elif close < ema20 < ema50 < ema100 < ema200:
            score += 0
        elif close < ema50 and ema50 < ema200:
            score += 3
        else:
            score += 11
    else:
        score += 11

    # 2. Market Structure
    ms = indicators.get("Market_Structure", "Neutral")
    if ms == "Bullish (HH/HL)":
        score += 13
    elif ms == "Bearish (LH/LL)":
        score += 0
    else:
        score += 6

    # 3. MACD
    macd = indicators.get("MACD")
    macd_sig = indicators.get("MACD_signal")
    if macd is not None and macd_sig is not None:
        if macd > macd_sig and macd > 0:
            score += 12
        elif macd > macd_sig:
            score += 8
        elif macd < macd_sig and macd > 0:
            score += 4
        else:
            score += 0
    else:
        score += 6

    # 4. RSI
    rsi = indicators.get("RSI")
    if rsi is not None:
        if 40 <= rsi <= 65:
            score += 10
        elif 65 < rsi < 75:
            score += 6
        elif rsi >= 75:
            score += 2
        elif rsi < 30:
            score += 7
        else:
            score += 4
    else:
        score += 5

    # 5. Volume Surge
    is_forex = False
    if symbol:
        symbol_upper = symbol.upper().strip()
        is_forex = symbol_upper.endswith("=X") or (len(symbol_upper) == 6 and symbol_upper.isalpha()) or "/" in symbol_upper or "-" in symbol_upper

    vol_surge = indicators.get("Volume_Surge", False)
    if is_forex:
        score += 8  # Bypass volume surge constraint for Forex
    elif vol_surge and close and ema20 and close > ema20:
        score += 8
    elif vol_surge and close and ema20 and close < ema20:
        score += 0
    else:
        score += 4

    # 6. SMC / ICT
    bull_ob = indicators.get("Bullish_OB", False)
    bull_fvg = indicators.get("Bullish_FVG", False)
    bear_ob = indicators.get("Bearish_OB", False)
    bear_fvg = indicators.get("Bearish_FVG", False)
    if bull_ob or bull_fvg:
        score += 8
    elif bear_ob or bear_fvg:
        score += 0
    else:
        score += 4

    # 7. CMF
    cmf = indicators.get("CMF")
    if cmf is not None:
        if cmf > 0.05:
            score += 5
        elif cmf < -0.05:
            score += 0
        else:
            score += 2
    else:
        score += 2

    # 8. ADX
    adx = indicators.get("ADX")
    if adx is not None:
        if adx > 25:
            score += 3
        else:
            score += 1
    else:
        score += 2

    # 9. Candlestick Patterns
    pat = indicators.get("Candlestick_Pattern")
    pat_name = pat.get("name") if isinstance(pat, dict) else pat
    bullish_patterns = ['Bullish Engulfing', 'Hammer', 'Morning Star', 'Bullish Pin Bar', 'Three White Soldiers', 'Tweezer Bottom']
    bearish_patterns = ['Bearish Engulfing', 'Shooting Star', 'Evening Star', 'Bearish Pin Bar', 'Three Black Crows', 'Tweezer Top']
    
    if pat_name in bullish_patterns:
        score += 5
    elif pat_name in bearish_patterns:
        score += 0
    else:
        score += 2

    # 10. Fib Proximity
    fib_prox = indicators.get("Fib_Proximity")
    if fib_prox:
        if fib_prox in ['0.618', '0.500', '0.382']:
            score += 5
        else:
            score += 3
    else:
        score += 0

    # 11. Liquidity Sweeps
    liq_bottom = indicators.get("Liquidity_Bottom_Present", False)
    liq_top = indicators.get("Liquidity_Top_Present", False)
    if liq_bottom and close and ema20 and close > ema20:
        score += 4
    elif liq_top and close and ema20 and close < ema20:
        score += 0
    elif liq_bottom or liq_top:
        score += 2
    else:
        score += 2

    # 12. Stochastic RSI
    stoch_k = indicators.get("StochRSI_K")
    if stoch_k is not None:
        if stoch_k < 20:
            score += 3
        elif stoch_k > 80:
            score += 0
        else:
            score += 1
    else:
        score += 1

    # Macro EMA200 Cap
    if ema200 and close and close < ema200 * 0.95 and score > 55:
        score = 55

    # Clamp 0-100
    return max(0, min(100, score))
