import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime

def get_options_data(symbol: str) -> dict:
    """
    Fetches options data for a symbol and calculates:
    - Surface IV (Skew & Term Structure)
    - Max Pain & Zone de gravité
    - Implied Move (Distribution Implicite)
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # Get options expirations
        expirations = ticker.options
        if not expirations:
            return {"error": "No options data available for this symbol."}
            
        # Get current spot price
        history = ticker.history(period="5d")
        if history.empty:
            return {"error": "Could not fetch spot price."}
            
        spot_price = history['Close'].iloc[-1]
        
        # We will use the nearest expiration for Max Pain and Implied Move
        near_expiry = expirations[0]
        chain = ticker.option_chain(near_expiry)
        
        calls = chain.calls
        puts = chain.puts
        
        if calls.empty or puts.empty:
            return {"error": "Empty option chain."}
            
        # 1. Calculate Max Pain
        # Max pain is the strike where options buyers lose the most money (and sellers make the most)
        strikes = set(calls['strike']).intersection(set(puts['strike']))
        strikes = sorted(list(strikes))
        
        max_pain_strike = 0
        min_loss = float('inf')
        
        loss_data = []
        
        for strike in strikes:
            # Calls loss: max(0, spot - strike) for all calls if price expires at 'strike'
            # Wait, at expiration, intrinsic value is max(0, S - K). 
            # If spot ends exactly at `strike`, then calls above `strike` expire worthless.
            # Calls below `strike` have value (strike - call_strike).
            call_loss = sum(calls[calls['strike'] < strike].apply(
                lambda row: (strike - row['strike']) * row['openInterest'], axis=1
            )) * 100 # Multiplier
            
            put_loss = sum(puts[puts['strike'] > strike].apply(
                lambda row: (row['strike'] - strike) * row['openInterest'], axis=1
            )) * 100
            
            total_loss = call_loss + put_loss
            loss_data.append({"strike": strike, "loss": total_loss})
            
            if total_loss < min_loss:
                min_loss = total_loss
                max_pain_strike = strike
                
        # 2. Skew (Asymétrie de la peur)
        # Compare IV of OTM Puts (strike < spot) to OTM Calls (strike > spot)
        otm_puts = puts[puts['strike'] < spot_price]
        otm_calls = calls[calls['strike'] > spot_price]
        
        put_iv = otm_puts['impliedVolatility'].mean() if not otm_puts.empty else 0
        call_iv = otm_calls['impliedVolatility'].mean() if not otm_calls.empty else 0
        
        skew_value = put_iv - call_iv
        skew_status = "NORMAL"
        if skew_value > 0.05:
            skew_status = "ELEVÉ (Peur)"
        elif skew_value < -0.02:
            skew_status = "APLATI/INVERSÉ (Euphorie)"
            
        # 3. Implied Move (Distribution)
        # Simplified implied move = Spot * ATM IV * sqrt(DTE/365)
        # Let's find ATM IV
        atm_strike = min(strikes, key=lambda x: abs(x - spot_price))
        atm_put_iv = puts[puts['strike'] == atm_strike]['impliedVolatility'].values
        atm_call_iv = calls[calls['strike'] == atm_strike]['impliedVolatility'].values
        
        atm_iv = 0
        if len(atm_put_iv) > 0 and len(atm_call_iv) > 0:
            atm_iv = (atm_put_iv[0] + atm_call_iv[0]) / 2
        elif len(atm_put_iv) > 0:
            atm_iv = atm_put_iv[0]
        elif len(atm_call_iv) > 0:
            atm_iv = atm_call_iv[0]
            
        # Calculate DTE (Days to Expiration)
        expiry_date = datetime.strptime(near_expiry, "%Y-%m-%d")
        now = datetime.now()
        dte = max(1, (expiry_date - now).days)
        
        implied_move_pct = atm_iv * np.sqrt(dte / 365)
        implied_move_value = spot_price * implied_move_pct
        
        # 4. Term Structure
        # Check if 30+ DTE IV > Near DTE IV (Contango) or < Near DTE IV (Backwardation)
        term_structure = "INCONNU"
        if len(expirations) > 1:
            far_expiry = expirations[min(len(expirations)-1, 3)] # Take one about a month out if possible
            far_chain = ticker.option_chain(far_expiry)
            far_atm_strike = min(far_chain.calls['strike'], key=lambda x: abs(x - spot_price))
            
            far_put_iv = far_chain.puts[far_chain.puts['strike'] == far_atm_strike]['impliedVolatility'].values
            far_call_iv = far_chain.calls[far_chain.calls['strike'] == far_atm_strike]['impliedVolatility'].values
            
            far_atm_iv = 0
            if len(far_put_iv) > 0 and len(far_call_iv) > 0:
                far_atm_iv = (far_put_iv[0] + far_call_iv[0]) / 2
                
            if atm_iv > far_atm_iv * 1.05:
                term_structure = "BACKWARDATION (Stress Imminent)"
            elif far_atm_iv > atm_iv * 1.05:
                term_structure = "CONTANGO (Calme Attendu)"
            else:
                term_structure = "PLATE (Incertitude)"

        # Downsample loss data for chart (max 20 points around ATM)
        loss_data = sorted(loss_data, key=lambda x: abs(x["strike"] - spot_price))[:20]
        loss_data = sorted(loss_data, key=lambda x: x["strike"])

        return {
            "spot_price": spot_price,
            "expiry": near_expiry,
            "dte": dte,
            "max_pain": {
                "strike": float(max_pain_strike),
                "data": loss_data
            },
            "surface": {
                "put_iv_avg": float(put_iv),
                "call_iv_avg": float(call_iv),
                "skew_value": float(skew_value),
                "skew_status": skew_status,
                "term_structure": term_structure
            },
            "distribution": {
                "atm_iv": float(atm_iv),
                "implied_move_pct": float(implied_move_pct * 100),
                "implied_move_value": float(implied_move_value),
                "upper_bound": float(spot_price + implied_move_value),
                "lower_bound": float(spot_price - implied_move_value)
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
