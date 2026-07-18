import yfinance as yf
import pandas as pd
import numpy as np

MACRO_TICKERS = {
    "VIX": "^VIX",
    "VVIX": "^VVIX",
    "NQ": "NQ=F",
    "HYG": "HYG",
    "TLT": "TLT",
    "DXY": "DX-Y.NYB",
    "Gold": "GC=F",
    "USDJPY": "USDJPY=X",
    "Oil": "CL=F",
    "US10Y": "^TNX",
    "US2Y": "^IRX"
}

def get_macro_data() -> dict:
    """
    Fetches macro data and calculates Z-scores, percentiles, stress index, 
    momentum, and divergences as described in the Macro Agent NQ PDF.
    """
    history_data = {}
    
    # Fetch 1 year of data to calculate 252-day Z-scores
    tickers_str = " ".join(MACRO_TICKERS.values())
    try:
        data = yf.download(tickers_str, period="1y", interval="1d", group_by="ticker", threads=True, progress=False)
        
        for name, ticker in MACRO_TICKERS.items():
            if len(MACRO_TICKERS) > 1:
                df = data[ticker] if ticker in data else pd.DataFrame()
            else:
                df = data
                
            if not df.empty and 'Close' in df.columns:
                df = df.dropna(subset=['Close'])
                history_data[name] = df
    except Exception as e:
        print(f"Error fetching macro data: {e}")

    results = {}
    
    for name, df in history_data.items():
        if df.empty or len(df) < 20:
            continue
            
        close_prices = df['Close']
        latest_price = close_prices.iloc[-1]
        
        # Calculate 252-day Z-Score
        mean_252 = close_prices.rolling(window=252, min_periods=20).mean()
        std_252 = close_prices.rolling(window=252, min_periods=20).std()
        
        current_mean = mean_252.iloc[-1]
        current_std = std_252.iloc[-1]
        
        z_score = (latest_price - current_mean) / current_std if current_std > 0 else 0
        
        # Calculate Percentile Rank
        percentile = (close_prices <= latest_price).mean() * 100
        
        # Regime Statistique
        regime = "NORMAL"
        if abs(z_score) > 2:
            regime = "EXTREME"
        elif abs(z_score) > 1:
            regime = "WARNING"
            
        # Momentum (5d, 10d, 20d)
        mom_5 = latest_price - close_prices.iloc[-5] if len(close_prices) >= 5 else 0
        mom_10 = latest_price - close_prices.iloc[-10] if len(close_prices) >= 10 else 0
        mom_20 = latest_price - close_prices.iloc[-20] if len(close_prices) >= 20 else 0
        
        pos_count = sum(1 for m in [mom_5, mom_10, mom_20] if m > 0)
        neg_count = sum(1 for m in [mom_5, mom_10, mom_20] if m < 0)
        
        if pos_count == 3: mom_score = 3
        elif pos_count == 2: mom_score = 2
        elif pos_count == 1 and neg_count == 0: mom_score = 1
        elif neg_count == 3: mom_score = -3
        elif neg_count == 2: mom_score = -2
        elif neg_count == 1 and pos_count == 0: mom_score = -1
        else: mom_score = 0
            
        results[name] = {
            "price": float(latest_price),
            "z_score": float(z_score),
            "percentile": float(percentile),
            "regime": regime,
            "momentum_score": mom_score,
            "change_pct": float((latest_price / close_prices.iloc[-2] - 1) * 100) if len(close_prices) >= 2 else 0
        }
        
    # Calculate Stress Index Composite (0-100)
    # Weights: VIX 30%, VVIX 20%, HYG 20% (inverted), TLT 15%, DXY 15%
    def normalize_z(z):
        val = (z + 3) / 6 * 100
        return max(0, min(100, val))

    stress_index = 50 # Default Neutral
    if all(k in results for k in ["VIX", "VVIX", "HYG", "TLT", "DXY"]):
        vix_s = normalize_z(results["VIX"]["z_score"])
        vvix_s = normalize_z(results["VVIX"]["z_score"])
        hyg_s = 100 - normalize_z(results["HYG"]["z_score"]) # Inverted
        tlt_s = normalize_z(results["TLT"]["z_score"]) # High TLT = Flight to safety
        dxy_s = normalize_z(results["DXY"]["z_score"])
        
        stress_index = (vix_s * 0.30) + (vvix_s * 0.20) + (hyg_s * 0.20) + (tlt_s * 0.15) + (dxy_s * 0.15)
        
    stress_regime = "RISK-ON"
    if stress_index >= 75: stress_regime = "EXTREME"
    elif stress_index >= 50: stress_regime = "RISK-OFF"
    elif stress_index >= 25: stress_regime = "NEUTRAL"

    # Divergences Intermarket
    divergences = []
    nq_chg = results.get("NQ", {}).get("change_pct", 0)
    hyg_chg = results.get("HYG", {}).get("change_pct", 0)
    vix_chg = results.get("VIX", {}).get("change_pct", 0)
    vvix_chg = results.get("VVIX", {}).get("change_pct", 0)
    dxy_chg = results.get("DXY", {}).get("change_pct", 0)
    tnx_chg = results.get("US10Y", {}).get("change_pct", 0)
    tlt_chg = results.get("TLT", {}).get("change_pct", 0)
    gold_chg = results.get("Gold", {}).get("change_pct", 0)
    
    if nq_chg > 0.3 and hyg_chg < -0.2:
        divergences.append({"code": "NQ^ HYGv", "desc": "Credit does not confirm the rally — fakeout probable", "action": "Caution, tight stops on longs", "type": "warning"})
    if vix_chg < -1 and vvix_chg > 1:
        divergences.append({"code": "VIXv VVIX^", "desc": "Apparent calm but options nervousness — hidden instability", "action": "Reduce size by 30%", "type": "warning"})
    if dxy_chg > 0.3 and tnx_chg > 0.3:
        divergences.append({"code": "DXY^ 10Y^", "desc": "Double pressure on NQ — very restrictive conditions", "action": "Avoid longs, look for shorts", "type": "danger"})
    if nq_chg > 0.5 and tlt_chg > 0.5:
        divergences.append({"code": "NQ^ TLT^", "desc": "Simultaneous equities AND bonds rally — lack of conviction", "action": "Suspect rally, do not overload", "type": "warning"})
    if nq_chg < -0.5 and gold_chg > 0.5:
        divergences.append({"code": "NQv Gold^", "desc": "Classic Risk-Off — flight to safety", "action": "Confirms bearish bias", "type": "danger"})
        
    return {
        "indicators": results,
        "stress_index": {
            "value": float(stress_index),
            "regime": stress_regime
        },
        "divergences": divergences
    }
