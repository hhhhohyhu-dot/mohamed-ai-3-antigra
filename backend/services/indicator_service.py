import pandas as pd
import pandas_ta as ta

def calculate_indicators(df: pd.DataFrame) -> dict:
    """
    Calculates technical indicators on the given DataFrame containing OHLCV data.
    """
    if df.empty or len(df) < 200:
        # Not enough data for some indicators like EMA200
        pass

    # Ensure index is datetime or just run on columns
    df_calc = df.copy()
    
    # EMAs
    df_calc['EMA20'] = ta.ema(df_calc['close'], length=20)
    df_calc['EMA50'] = ta.ema(df_calc['close'], length=50)
    df_calc['EMA100'] = ta.ema(df_calc['close'], length=100)
    df_calc['EMA200'] = ta.ema(df_calc['close'], length=200)

    # RSI
    df_calc['RSI'] = ta.rsi(df_calc['close'], length=14)

    # MACD
    macd = ta.macd(df_calc['close'])
    if macd is not None and not macd.empty:
        df_calc['MACD'] = macd.iloc[:, 0]
        df_calc['MACD_signal'] = macd.iloc[:, 1]
        df_calc['MACD_hist'] = macd.iloc[:, 2]

    # ATR
    df_calc['ATR'] = ta.atr(df_calc['high'], df_calc['low'], df_calc['close'], length=14)

    # ADX
    adx = ta.adx(df_calc['high'], df_calc['low'], df_calc['close'])
    if adx is not None and not adx.empty:
        df_calc['ADX'] = adx.iloc[:, 0]

    # VWAP
    if 'time' in df_calc.columns:
        df_calc['datetime'] = pd.to_datetime(df_calc['time'])
        df_calc.set_index('datetime', inplace=True)
    vwap = ta.vwap(df_calc['high'], df_calc['low'], df_calc['close'], df_calc['volume'])
    if vwap is not None and not vwap.empty:
        df_calc['VWAP'] = vwap

    # Bollinger Bands
    bbands = ta.bbands(df_calc['close'])
    if bbands is not None and not bbands.empty:
        df_calc['BB_lower'] = bbands.iloc[:, 0]
        df_calc['BB_mid'] = bbands.iloc[:, 1]
        df_calc['BB_upper'] = bbands.iloc[:, 2]

    # Custom Robust CCI Calculation
    tp = (df_calc['high'] + df_calc['low'] + df_calc['close']) / 3
    sma_tp = tp.rolling(window=20).mean()
    mad = tp.rolling(window=20).apply(lambda x: pd.Series(x).sub(pd.Series(x).mean()).abs().mean(), raw=False)
    df_calc['CCI'] = (tp - sma_tp) / (0.015 * mad)

    # OBV
    df_calc['OBV'] = ta.obv(df_calc['close'], df_calc['volume'])

    # Stochastic RSI
    stochrsi = ta.stochrsi(df_calc['close'])
    if stochrsi is not None and not stochrsi.empty:
        df_calc['StochRSI_K'] = stochrsi.iloc[:, 0]
        df_calc['StochRSI_D'] = stochrsi.iloc[:, 1]

    # Support / Resistance
    df_calc['Support'] = df_calc['low'].rolling(window=20).min()
    df_calc['Resistance'] = df_calc['high'].rolling(window=20).max()

    # Pivot Points (Standard)
    df_calc['Pivot'] = (df_calc['high'] + df_calc['low'] + df_calc['close']) / 3
    df_calc['R1'] = (2 * df_calc['Pivot']) - df_calc['low']
    df_calc['S1'] = (2 * df_calc['Pivot']) - df_calc['high']

    # Volatility
    df_calc['Volatility'] = (df_calc['ATR'] / df_calc['close']) * 100 if 'ATR' in df_calc.columns else None

    # --- ADVANCED CONCEPTS ---

    # Volume Confirmation & Advanced Metrics
    df_calc['Volume_SMA20'] = df_calc['volume'].rolling(window=20).mean()
    df_calc['Volume_Surge'] = df_calc['volume'] > (df_calc['Volume_SMA20'] * 1.5)
    df_calc['RVOL'] = df_calc['volume'] / df_calc['Volume_SMA20']
    
    is_bull = df_calc['close'] >= df_calc['open']
    is_bear = df_calc['close'] < df_calc['open']
    df_calc['Buying_Volume'] = df_calc['volume'].where(is_bull, 0)
    df_calc['Selling_Volume'] = df_calc['volume'].where(is_bear, 0)
    
    vol_sma_current = df_calc['Volume_SMA20']
    vol_sma_prev = df_calc['Volume_SMA20'].shift(5)
    
    def vol_trend(row):
        if pd.isna(row['curr']) or pd.isna(row['prev']): return "Neutral"
        if row['curr'] > row['prev'] * 1.1: return "Increasing"
        if row['curr'] < row['prev'] * 0.9: return "Decreasing"
        return "Stable"
        
    df_calc['Volume_Trend'] = pd.DataFrame({'curr': vol_sma_current, 'prev': vol_sma_prev}).apply(vol_trend, axis=1)

    # Advanced Candlestick Patterns
    body = abs(df_calc['close'] - df_calc['open'])
    hl_range = df_calc['high'] - df_calc['low']
    
    is_doji = body <= (hl_range * 0.1)
    
    lower_wick = df_calc[['open', 'close']].min(axis=1) - df_calc['low']
    upper_wick = df_calc['high'] - df_calc[['open', 'close']].max(axis=1)
    is_hammer = (lower_wick > (2 * body)) & (upper_wick < (0.1 * hl_range)) & (body > 0)
    is_shooting_star = (upper_wick > (2 * body)) & (lower_wick < (0.1 * hl_range)) & (body > 0)
    
    prev_open = df_calc['open'].shift(1)
    prev_close = df_calc['close'].shift(1)
    
    is_bullish_engulfing = (prev_close < prev_open) & (df_calc['close'] > df_calc['open']) & (df_calc['close'] > prev_open) & (df_calc['open'] < prev_close)
    is_bearish_engulfing = (prev_close > prev_open) & (df_calc['close'] < df_calc['open']) & (df_calc['close'] < prev_open) & (df_calc['open'] > prev_close)
    
    prev2_open = df_calc['open'].shift(2)
    prev2_close = df_calc['close'].shift(2)
    prev_is_doji = is_doji.shift(1)
    
    is_morning_star = (prev2_close < prev2_open) & prev_is_doji & (df_calc['close'] > df_calc['open']) & (df_calc['close'] > prev2_close)
    is_evening_star = (prev2_close > prev2_open) & prev_is_doji & (df_calc['close'] < df_calc['open']) & (df_calc['close'] < prev2_close)

    patterns = []
    for i in range(len(df_calc)):
        if is_morning_star.iloc[i]: patterns.append({"name": "Morning Star", "strength": 90, "description": "Strong 3-candle bullish reversal."})
        elif is_evening_star.iloc[i]: patterns.append({"name": "Evening Star", "strength": 90, "description": "Strong 3-candle bearish reversal."})
        elif is_bullish_engulfing.iloc[i]: patterns.append({"name": "Bullish Engulfing", "strength": 85, "description": "Strong bullish momentum absorbing prior selling."})
        elif is_bearish_engulfing.iloc[i]: patterns.append({"name": "Bearish Engulfing", "strength": 85, "description": "Strong bearish momentum absorbing prior buying."})
        elif is_hammer.iloc[i]: patterns.append({"name": "Hammer", "strength": 75, "description": "Bullish rejection of lower prices."})
        elif is_shooting_star.iloc[i]: patterns.append({"name": "Shooting Star", "strength": 75, "description": "Bearish rejection of higher prices."})
        elif is_doji.iloc[i]: patterns.append({"name": "Doji", "strength": 50, "description": "Market indecision."})
        else: patterns.append({"name": "None", "strength": 0, "description": "No significant pattern."})
        
    df_calc['Candlestick_Pattern'] = patterns

    # ATR-based Stop Loss
    if 'ATR' in df_calc.columns:
        df_calc['ATR_SL_Long'] = df_calc['close'] - (1.5 * df_calc['ATR'])
        df_calc['ATR_SL_Short'] = df_calc['close'] + (1.5 * df_calc['ATR'])

    # Market Structure (Simple HH/LL over 20 days vs previous 20 days)
    df_calc['HH_20'] = df_calc['high'].rolling(window=20).max()
    df_calc['LL_20'] = df_calc['low'].rolling(window=20).min()
    df_calc['Prev_HH_20'] = df_calc['HH_20'].shift(20)
    df_calc['Prev_LL_20'] = df_calc['LL_20'].shift(20)

    def determine_structure(row):
        if pd.isna(row['Prev_HH_20']): return "Neutral"
        if row['HH_20'] > row['Prev_HH_20'] and row['LL_20'] > row['Prev_LL_20']:
            return "Bullish (HH/HL)"
        if row['HH_20'] < row['Prev_HH_20'] and row['LL_20'] < row['Prev_LL_20']:
            return "Bearish (LH/LL)"
        return "Consolidating"

    df_calc['Market_Structure'] = df_calc.apply(determine_structure, axis=1)

    # Price Action (Distance from EMAs)
    if 'EMA50' in df_calc.columns:
        df_calc['PA_EMA50_Dist'] = ((df_calc['close'] - df_calc['EMA50']) / df_calc['EMA50']) * 100

    # Trend Strength (Based on ADX)
    def determine_trend(adx_val):
        if pd.isna(adx_val): return "Unknown"
        if adx_val > 25: return "Strong"
        if adx_val > 20: return "Weak"
        return "None"
    df_calc['Trend_Strength'] = df_calc['ADX'].apply(determine_trend) if 'ADX' in df_calc.columns else "Unknown"

    # Get the latest values
    latest = df_calc.iloc[-1]

    indicators_dict = {
        'EMA20': latest.get('EMA20'),
        'EMA50': latest.get('EMA50'),
        'EMA100': latest.get('EMA100'),
        'EMA200': latest.get('EMA200'),
        'RSI': latest.get('RSI'),
        'MACD': latest.get('MACD'),
        'MACD_signal': latest.get('MACD_signal'),
        'ATR': latest.get('ATR'),
        'ADX': latest.get('ADX'),
        'BB_lower': latest.get('BB_lower'),
        'BB_upper': latest.get('BB_upper'),
        'CCI': latest.get('CCI'),
        'OBV': latest.get('OBV'),
        'StochRSI_K': latest.get('StochRSI_K'),
        'StochRSI_D': latest.get('StochRSI_D'),
        'VWAP': latest.get('VWAP'),
        'Support': latest.get('Support'),
        'Resistance': latest.get('Resistance'),
        'Pivot': latest.get('Pivot'),
        'R1': latest.get('R1'),
        'S1': latest.get('S1'),
        'Volatility': latest.get('Volatility'),
        'Trend_Strength': latest.get('Trend_Strength'),
        # Volume
        'Volume_Surge': bool(latest.get('Volume_Surge')),
        'RVOL': latest.get('RVOL'),
        'Buying_Volume': latest.get('Buying_Volume'),
        'Selling_Volume': latest.get('Selling_Volume'),
        'Volume_Trend': latest.get('Volume_Trend'),
        # Candlestick
        'Candlestick_Pattern': latest.get('Candlestick_Pattern'),
        # Trade Setup
        'ATR_SL_Long': latest.get('ATR_SL_Long'),
        'ATR_SL_Short': latest.get('ATR_SL_Short'),
        'Market_Structure': latest.get('Market_Structure'),
        'PA_EMA50_Dist_Pct': latest.get('PA_EMA50_Dist')
    }

    # Replace NaNs with None for JSON serialization
    for k, v in indicators_dict.items():
        if isinstance(v, str) or isinstance(v, bool) or isinstance(v, dict):
            continue
        try:
            if pd.isna(v):
                indicators_dict[k] = None
            else:
                indicators_dict[k] = float(v)
        except (TypeError, ValueError):
            pass

    return indicators_dict
