import pandas as pd
import numpy as np
from services.data_service import get_historical_data

def run_backtest_simulation(symbol: str, strategy: str, initial_capital: float, parameters: dict) -> dict:
    """
    Simulates a trading strategy on historical data for a given symbol over the last 1 year.
    Calculates returns, win rate, drawdown, profit factor, and lists executed trades.
    """
    # 1. Fetch 1 year of daily historical data
    try:
        df = get_historical_data(symbol, period="1y", interval="1d")
    except Exception as e:
        return {"error": f"Failed to fetch historical data for {symbol}: {str(e)}"}

    if df.empty:
        return {"error": f"No historical data found for symbol {symbol}"}
    
    # Sort data chronologically
    df = df.sort_values('time').reset_index(drop=True)
    
    # 2. Calculate Indicators based on strategy
    if strategy == "EMA_Crossover":
        fast = int(parameters.get("fast_period", 9))
        slow = int(parameters.get("slow_period", 21))
        df['ema_fast'] = df['close'].ewm(span=fast, adjust=False).mean()
        df['ema_slow'] = df['close'].ewm(span=slow, adjust=False).mean()
        
        # Buy signal: fast crosses above slow
        df['buy_sig'] = (df['ema_fast'] > df['ema_slow']) & (df['ema_fast'].shift(1) <= df['ema_slow'].shift(1))
        # Sell signal: fast crosses below slow
        df['sell_sig'] = (df['ema_fast'] < df['ema_slow']) & (df['ema_fast'].shift(1) >= df['ema_slow'].shift(1))
        
    elif strategy == "RSI_Reversion":
        period = int(parameters.get("rsi_period", 14))
        oversold = float(parameters.get("oversold_threshold", 30))
        overbought = float(parameters.get("overbought_threshold", 70))
        
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / (loss + 1e-10)
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # Buy when RSI is oversold and crosses above
        df['buy_sig'] = (df['rsi'] < oversold) & (df['rsi'].shift(1) >= oversold)
        # Sell when RSI is overbought and crosses below
        df['sell_sig'] = (df['rsi'] > overbought) & (df['rsi'].shift(1) <= overbought)
        
    elif strategy == "MACD_Crossover":
        fast = int(parameters.get("fast_period", 12))
        slow = int(parameters.get("slow_period", 26))
        signal = int(parameters.get("signal_period", 9))
        
        ema_fast = df['close'].ewm(span=fast, adjust=False).mean()
        ema_slow = df['close'].ewm(span=slow, adjust=False).mean()
        df['macd'] = ema_fast - ema_slow
        df['macd_signal'] = df['macd'].ewm(span=signal, adjust=False).mean()
        
        # Buy signal: MACD crosses above MACD Signal
        df['buy_sig'] = (df['macd'] > df['macd_signal']) & (df['macd'].shift(1) <= df['macd_signal'].shift(1))
        # Sell signal: MACD crosses below MACD Signal
        df['sell_sig'] = (df['macd'] < df['macd_signal']) & (df['macd'].shift(1) >= df['macd_signal'].shift(1))
        
    elif strategy == "Bollinger_Bands":
        period = int(parameters.get("bb_period", 20))
        std_dev = float(parameters.get("std_dev", 2.0))
        
        df['ma'] = df['close'].rolling(window=period).mean()
        df['std'] = df['close'].rolling(window=period).std()
        df['bb_upper'] = df['ma'] + (std_dev * df['std'])
        df['bb_lower'] = df['ma'] - (std_dev * df['std'])
        
        # Buy signal: close crosses below lower band
        df['buy_sig'] = (df['close'] < df['bb_lower']) & (df['close'].shift(1) >= df['bb_lower'].shift(1))
        # Sell signal: close crosses above upper band
        df['sell_sig'] = (df['close'] > df['bb_upper']) & (df['close'].shift(1) <= df['bb_upper'].shift(1))
    else:
        return {"error": f"Unknown strategy {strategy}"}
        
    # Fill NaNs from rolling indicators
    df = df.ffill().bfill().fillna(0)
    
    # 3. Simulate Trades
    capital = initial_capital
    position = 0.0  # size in shares
    entry_price = 0.0
    entry_date = ""
    trades = []
    equity_curve = []
    
    # Record starting equity
    equity_curve.append({"time": df.loc[0, 'time'], "value": round(capital, 2)})
    
    for idx, row in df.iterrows():
        if idx == 0:
            continue
            
        current_price = float(row['close'])
        current_time = row['time']
        
        buy_triggered = bool(row.get('buy_sig', False))
        sell_triggered = bool(row.get('sell_sig', False))
        
        # If holding a position, check for exit
        if position > 0:
            current_equity = position * current_price
            if sell_triggered:
                pnl_abs = current_equity - (position * entry_price)
                pnl_pct = (current_price - entry_price) / entry_price * 100
                capital = current_equity
                
                trades.append({
                    "id": len(trades) + 1,
                    "type": "SELL (Close)",
                    "entry_date": entry_date,
                    "exit_date": current_time,
                    "entry_price": round(entry_price, 2),
                    "exit_price": round(current_price, 2),
                    "pnl_pct": round(pnl_pct, 2),
                    "pnl_abs": round(pnl_abs, 2),
                    "balance_after": round(capital, 2)
                })
                position = 0.0
                entry_price = 0.0
                entry_date = ""
            
        # If in cash, check for entry
        else:
            if buy_triggered:
                entry_price = current_price
                entry_date = current_time
                position = capital / entry_price
                
                trades.append({
                    "id": len(trades) + 1,
                    "type": "BUY (Open)",
                    "entry_date": entry_date,
                    "exit_date": "",
                    "entry_price": round(entry_price, 2),
                    "exit_price": 0.0,
                    "pnl_pct": 0.0,
                    "pnl_abs": 0.0,
                    "balance_after": round(capital, 2)
                })
                
        # Record equity curve point
        active_equity = capital if position == 0.0 else position * current_price
        
        # Avoid duplicate times in equity curve
        if len(equity_curve) > 0 and equity_curve[-1]["time"] == current_time:
            equity_curve[-1]["value"] = round(active_equity, 2)
        else:
            equity_curve.append({"time": current_time, "value": round(active_equity, 2)})
            
    # Force close any open trade at the end of backtest to calculate final PNL
    if position > 0:
        last_row = df.iloc[-1]
        last_price = float(last_row['close'])
        last_time = last_row['time']
        
        pnl_abs = (position * last_price) - (position * entry_price)
        pnl_pct = (last_price - entry_price) / entry_price * 100
        capital = position * last_price
        
        trades[-1] = {
            "id": len(trades),
            "type": "BUY (Closed at end)",
            "entry_date": entry_date,
            "exit_date": last_time,
            "entry_price": round(entry_price, 2),
            "exit_price": round(last_price, 2),
            "pnl_pct": round(pnl_pct, 2),
            "pnl_abs": round(pnl_abs, 2),
            "balance_after": round(capital, 2)
        }
        
    # Extract completed trades
    completed_trades = [t for t in trades if t["exit_date"] != ""]
    
    # 4. Calculate Metrics
    total_trades = len(completed_trades)
    winning_trades = [t for t in completed_trades if t["pnl_abs"] > 0]
    losing_trades = [t for t in completed_trades if t["pnl_abs"] <= 0]
    
    win_rate = (len(winning_trades) / total_trades * 100) if total_trades > 0 else 0.0
    
    gross_profits = sum(t["pnl_abs"] for t in winning_trades)
    gross_losses = abs(sum(t["pnl_abs"] for t in losing_trades))
    
    profit_factor = (gross_profits / gross_losses) if gross_losses > 0 else (gross_profits if gross_profits > 0 else 1.0)
    if gross_losses == 0 and gross_profits > 0:
        profit_factor = 99.9  # high cap
        
    total_return = (capital - initial_capital) / initial_capital * 100
    
    # Calculate Max Drawdown
    equity_values = [pt["value"] for pt in equity_curve]
    peaks = np.maximum.accumulate(equity_values)
    drawdowns = (peaks - equity_values) / (peaks + 1e-10) * 100
    max_drawdown = float(np.max(drawdowns)) if len(drawdowns) > 0 else 0.0
    
    return {
        "symbol": symbol.upper(),
        "strategy": strategy,
        "initial_capital": initial_capital,
        "final_capital": round(capital, 2),
        "total_return_pct": round(total_return, 2),
        "win_rate_pct": round(win_rate, 2),
        "profit_factor": round(profit_factor, 2),
        "max_drawdown_pct": round(max_drawdown, 2),
        "total_trades": total_trades,
        "completed_trades": completed_trades,
        "equity_curve": equity_curve
    }
