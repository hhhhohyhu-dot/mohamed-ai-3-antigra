import yfinance as yf
import pandas as pd
import numpy as np
import random

FOREX_CORR_PAIRS = [
    "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCAD=X", "USDCHF=X", 
    "AUDUSD=X", "NZDUSD=X", "EURGBP=X", "EURJPY=X", "GBPJPY=X"
]

def calculate_forex_correlation() -> dict:
    """
    Downloads historical daily data (1 year) for major forex pairs and
    calculates the correlation matrix of daily return differences.
    """
    try:
        # Download daily close prices for the past year
        tickers_str = " ".join(FOREX_CORR_PAIRS)
        data = yf.download(tickers_str, period="1y", interval="1d", group_by="ticker", progress=False)
        
        # Extract close prices
        prices = {}
        for ticker in FOREX_CORR_PAIRS:
            clean_name = ticker.replace("=X", "")
            if ticker in data and 'Close' in data[ticker]:
                prices[clean_name] = data[ticker]['Close']
            else:
                # Fallback multi-index checks
                try:
                    prices[clean_name] = data[('Close', ticker)]
                except:
                    pass
                    
        df = pd.DataFrame(prices).dropna()
        if df.empty or len(df) < 30:
            return get_mock_correlation()
            
        # Calculate daily percent returns
        returns = df.pct_change().dropna()
        
        # Calculate Pearson correlation matrix
        corr_matrix = returns.corr(method='pearson')
        
        # Convert matrix to dictionary for JSON output
        matrix_dict = {}
        for col in corr_matrix.columns:
            matrix_dict[col] = {idx: round(float(val), 3) if not np.isnan(val) else 0.0 for idx, val in corr_matrix[col].items()}
            
        return {
            "status": "success",
            "matrix": matrix_dict,
            "pairs": list(corr_matrix.columns)
        }
    except Exception as e:
        print(f"Error calculating correlations: {e}")
        return get_mock_correlation()


def get_mock_correlation() -> dict:
    """
    Generates a realistic correlation matrix of currency pairs for offline/fallback use.
    """
    pairs = ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "USDCHF", "AUDUSD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"]
    matrix = {}
    
    for p1 in pairs:
        matrix[p1] = {}
        for p2 in pairs:
            if p1 == p2:
                matrix[p1][p2] = 1.0
            else:
                # Assign statically realistic values to simulate standard market dynamics
                pair_set = {p1, p2}
                if pair_set == {"EURUSD", "GBPUSD"}: val = 0.82
                elif pair_set == {"EURUSD", "USDCHF"}: val = -0.78
                elif pair_set == {"AUDUSD", "NZDUSD"}: val = 0.81
                elif pair_set == {"USDJPY", "GBPJPY"}: val = 0.58
                elif pair_set == {"EURUSD", "EURJPY"}: val = 0.62
                elif pair_set == {"EURUSD", "EURGBP"}: val = 0.15
                elif pair_set == {"USDCAD", "USDCHF"}: val = 0.45
                elif pair_set == {"USDJPY", "USDCHF"}: val = 0.38
                elif pair_set == {"EURUSD", "USDCAD"}: val = -0.42
                else:
                    random.seed(p1 + p2)
                    val = random.uniform(-0.35, 0.35)
                matrix[p1][p2] = round(val, 3)
                
    return {
        "status": "mock",
        "matrix": matrix,
        "pairs": pairs
    }
