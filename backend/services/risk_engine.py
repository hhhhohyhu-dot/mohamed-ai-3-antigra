def calculate_risk(entry: float, stop_loss: float, take_profit: float, capital: float = 150.0, risk_pct: float = 1.0, max_risk_pct: float = 2.0) -> dict:
    """
    Calculates strict risk metrics and accepts/rejects a trade based on RR and Risk.
    """
    if capital is None or capital <= 0:
        capital = 150.0
    if risk_pct is None or risk_pct <= 0 or risk_pct > max_risk_pct:
        risk_pct = 1.0

    risk_amount = capital * (risk_pct / 100.0)
    
    # Calculate absolute risk and reward per unit
    risk_per_unit = abs(entry - stop_loss)
    reward_per_unit = abs(take_profit - entry)
    
    if risk_per_unit == 0:
        return {"approved": False, "reason": "Stop loss equals entry price.", "risk_reward_ratio": 0}
        
    risk_reward_ratio = reward_per_unit / risk_per_unit
    
    # Position Size based on risk amount
    position_size = risk_amount / risk_per_unit
    total_position_value = position_size * entry
    
    # Simplified Margin calculation (assuming 1:100 leverage as standard benchmark)
    margin_required = total_position_value / 100.0
    
    potential_profit = position_size * reward_per_unit
    potential_loss = position_size * risk_per_unit
    
    approved = risk_reward_ratio >= 2.0
    
    trade_quality = "Excellent" if risk_reward_ratio >= 3.0 else "Good" if risk_reward_ratio >= 2.0 else "Poor"
    
    reason = "Trade approved." if approved else f"Risk/Reward ratio is {risk_reward_ratio:.2f}, must be >= 2.0"
    
    return {
        "approved": approved,
        "reason": reason,
        "capital": capital,
        "risk_percentage": risk_pct,
        "risk_amount": risk_amount,
        "risk_reward_ratio": round(risk_reward_ratio, 2),
        "position_size": round(position_size, 5),
        "margin_required": round(margin_required, 2),
        "potential_profit": round(potential_profit, 2),
        "potential_loss": round(potential_loss, 2),
        "trade_quality": trade_quality
    }
