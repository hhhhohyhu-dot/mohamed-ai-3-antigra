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
    # pandas_ta requires 'high', 'low', 'close', 'volume' columns

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

    # CCI
    df_calc['CCI'] = ta.cci(df_calc['high'], df_calc['low'], df_calc['close'], length=14)

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

    # Volume Confirmation
    df_calc['Volume_SMA20'] = df_calc['volume'].rolling(window=20).mean()
    df_calc['Volume_Surge'] = df_calc['volume'] > (df_calc['Volume_SMA20'] * 1.5)

    # Candlestick Patterns (Custom basic logic since TA-Lib is not installed)
    # Basic Doji: Body is very small compared to the whole candle
    body = abs(df_calc['close'] - df_calc['open'])
    hl_range = df_calc['high'] - df_calc['low']
    df_calc['Pattern_Doji'] = body < (hl_range * 0.1)
    
    # Basic Engulfing: 
    # Bullish: Previous body is bearish, current body is bullish and engulfs previous body
    prev_open = df_calc['open'].shift(1)
    prev_close = df_calc['close'].shift(1)
    
    bullish_engulfing = (prev_close < prev_open) & (df_calc['close'] > df_calc['open']) & (df_calc['close'] > prev_open) & (df_calc['open'] < prev_close)
    bearish_engulfing = (prev_close > prev_open) & (df_calc['close'] < df_calc['open']) & (df_calc['close'] < prev_open) & (df_calc['open'] > prev_close)
    
    df_calc['Pattern_Engulfing'] = 0
    df_calc.loc[bullish_engulfing, 'Pattern_Engulfing'] = 100
    df_calc.loc[bearish_engulfing, 'Pattern_Engulfing'] = -100

    # Basic Hammer: Long lower wick, small body, short upper wick
    lower_wick = df_calc[['open', 'close']].min(axis=1) - df_calc['low']
    upper_wick = df_calc['high'] - df_calc[['open', 'close']].max(axis=1)
    df_calc['Pattern_Hammer'] = (lower_wick > (2 * body)) & (upper_wick < (0.1 * hl_range)) & (body > 0)

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

    # Candlestick readable format
    current_pattern = "None"
    if latest.get('Pattern_Engulfing') == 100: current_pattern = "Bullish Engulfing"
    elif latest.get('Pattern_Engulfing') == -100: current_pattern = "Bearish Engulfing"
    elif latest.get('Pattern_Hammer'): current_pattern = "Hammer"
    elif latest.get('Pattern_Doji'): current_pattern = "Doji"

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
        # New Additions
        'Volume_Surge': bool(latest.get('Volume_Surge')),
        'Candlestick_Pattern': current_pattern,
        'ATR_SL_Long': latest.get('ATR_SL_Long'),
        'ATR_SL_Short': latest.get('ATR_SL_Short'),
        'Market_Structure': latest.get('Market_Structure'),
        'PA_EMA50_Dist_Pct': latest.get('PA_EMA50_Dist')
    }

    # Replace NaNs with None for JSON serialization
    for k, v in indicators_dict.items():
        if isinstance(v, str) or isinstance(v, bool):
            continue
        try:
            if pd.isna(v):
                indicators_dict[k] = None
            else:
                indicators_dict[k] = float(v)
        except (TypeError, ValueError):
            pass

    return indicators_dict

