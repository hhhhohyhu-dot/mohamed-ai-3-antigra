import pandas as pd
import pandas_ta as ta

def calculate_indicators(df: pd.DataFrame) -> dict:
    """
    Calculates technical indicators on the given DataFrame containing OHLCV data.
    Includes: EMAs, RSI, MACD, ATR, ADX, VWAP, Bollinger Bands, CCI, OBV, StochRSI,
    Support/Resistance, Pivot Points, Volatility, Advanced Candlestick Patterns (12 types),
    Chaikin Money Flow, Fibonacci Proximity, SMC/ICT concepts, and more.
    """
    if df.empty or len(df) < 30:
        return {}

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
    df_calc['R2'] = df_calc['Pivot'] + (df_calc['high'] - df_calc['low'])
    df_calc['S2'] = df_calc['Pivot'] - (df_calc['high'] - df_calc['low'])

    # Volatility
    df_calc['Volatility'] = (df_calc['ATR'] / df_calc['close']) * 100 if 'ATR' in df_calc.columns else None

    # --- VOLUME ANALYSIS ---
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

    # --- CHAIKIN MONEY FLOW (CMF) ---
    # Measures institutional buying vs selling pressure over 20 periods
    hl_range = df_calc['high'] - df_calc['low']
    clv = ((df_calc['close'] - df_calc['low']) - (df_calc['high'] - df_calc['close'])) / hl_range.replace(0, 1)
    money_flow_volume = clv * df_calc['volume']
    df_calc['CMF'] = money_flow_volume.rolling(window=20).sum() / df_calc['volume'].rolling(window=20).sum()
    # CMF > 0.05: Institutional accumulation (Bullish)
    # CMF < -0.05: Institutional distribution (Bearish)
    def cmf_signal(val):
        if pd.isna(val): return "Neutral"
        if val > 0.15: return "Strong Accumulation"
        if val > 0.05: return "Accumulation"
        if val < -0.15: return "Strong Distribution"
        if val < -0.05: return "Distribution"
        return "Neutral"
    df_calc['CMF_Signal'] = df_calc['CMF'].apply(cmf_signal)

    # --- ADVANCED CANDLESTICK PATTERNS (12 types) ---
    body = abs(df_calc['close'] - df_calc['open'])
    hl_range_c = df_calc['high'] - df_calc['low']
    
    lower_wick = df_calc[['open', 'close']].min(axis=1) - df_calc['low']
    upper_wick = df_calc['high'] - df_calc[['open', 'close']].max(axis=1)
    
    # Doji: body is very small
    is_doji = body <= (hl_range_c * 0.1)
    
    # Hammer: long lower wick, small upper wick (bullish reversal at bottom)
    is_hammer = (lower_wick > (2 * body)) & (upper_wick < (0.3 * hl_range_c)) & (body > 0) & (df_calc['close'] > df_calc['open'])
    
    # Inverted Hammer: long upper wick, small lower wick (potential bullish reversal)
    is_inverted_hammer = (upper_wick > (2 * body)) & (lower_wick < (0.3 * hl_range_c)) & (body > 0) & (df_calc['close'] > df_calc['open'])
    
    # Shooting Star: long upper wick, small lower wick (bearish reversal at top)
    is_shooting_star = (upper_wick > (2 * body)) & (lower_wick < (0.3 * hl_range_c)) & (body > 0) & (df_calc['close'] < df_calc['open'])
    
    prev_open = df_calc['open'].shift(1)
    prev_close = df_calc['close'].shift(1)
    prev_high = df_calc['high'].shift(1)
    prev_low = df_calc['low'].shift(1)
    
    # Pin Bar (Bullish): Long lower tail, small body, close near high - strong rejection
    is_pin_bar_bull = (lower_wick > (2.5 * body)) & (upper_wick < (0.5 * body)) & (body > 0)
    
    # Pin Bar (Bearish): Long upper tail, small body, close near low - strong rejection
    is_pin_bar_bear = (upper_wick > (2.5 * body)) & (lower_wick < (0.5 * body)) & (body > 0)
    
    # Inside Bar: Current bar's high and low is within previous bar's range
    is_inside_bar = (df_calc['high'] < prev_high) & (df_calc['low'] > prev_low)
    
    # Bullish Engulfing
    is_bullish_engulfing = (prev_close < prev_open) & (df_calc['close'] > df_calc['open']) & (df_calc['close'] > prev_open) & (df_calc['open'] < prev_close)
    
    # Bearish Engulfing
    is_bearish_engulfing = (prev_close > prev_open) & (df_calc['close'] < df_calc['open']) & (df_calc['close'] < prev_open) & (df_calc['open'] > prev_close)
    
    # Harami (Bullish): Large bearish candle followed by small bullish candle contained within it
    is_bullish_harami = (prev_close < prev_open) & (df_calc['close'] > df_calc['open']) & (df_calc['open'] > prev_close) & (df_calc['close'] < prev_open) & (body < abs(prev_close - prev_open) * 0.5)

    # Harami (Bearish): Large bullish candle followed by small bearish candle contained within it
    is_bearish_harami = (prev_close > prev_open) & (df_calc['close'] < df_calc['open']) & (df_calc['open'] < prev_close) & (df_calc['close'] > prev_open) & (body < abs(prev_close - prev_open) * 0.5)
    
    # Tweezer Tops & Bottoms
    atr_val = df_calc['ATR'] if 'ATR' in df_calc.columns else df_calc['close'] * 0.01
    is_tweezer_top = (abs(df_calc['high'] - prev_high) < (atr_val * 0.05)) & (df_calc['close'] < df_calc['open']) & (prev_close > prev_open)
    is_tweezer_bottom = (abs(df_calc['low'] - prev_low) < (atr_val * 0.05)) & (df_calc['close'] > df_calc['open']) & (prev_close < prev_open)

    prev2_open = df_calc['open'].shift(2)
    prev2_close = df_calc['close'].shift(2)
    prev_is_doji = is_doji.shift(1)
    
    is_morning_star = (prev2_close < prev2_open) & prev_is_doji & (df_calc['close'] > df_calc['open']) & (df_calc['close'] > prev2_close)
    is_evening_star = (prev2_close > prev2_open) & prev_is_doji & (df_calc['close'] < df_calc['open']) & (df_calc['close'] < prev2_close)

    # --- NEW PATTERNS ---
    # Pin Bar: small body (< 25% of range), one dominant wick (>= 60% of range)
    is_bullish_pin = (body <= (hl_range * 0.25)) & (lower_wick >= (hl_range * 0.6)) & (hl_range > 0)
    is_bearish_pin = (body <= (hl_range * 0.25)) & (upper_wick >= (hl_range * 0.6)) & (hl_range > 0)

    # Three White Soldiers: 3 consecutive bullish candles, each closing higher
    prev2_is_bull = df_calc['close'].shift(2) > df_calc['open'].shift(2)
    prev_is_bull = prev_close > prev_open
    curr_is_bull = df_calc['close'] > df_calc['open']
    is_3ws = prev2_is_bull & prev_is_bull & curr_is_bull & (prev_close > df_calc['close'].shift(2)) & (df_calc['close'] > prev_close)

    # Three Black Crows: 3 consecutive bearish candles, each closing lower
    prev2_is_bear = df_calc['close'].shift(2) < df_calc['open'].shift(2)
    prev_is_bear = prev_close < prev_open
    curr_is_bear = df_calc['close'] < df_calc['open']
    is_3bc = prev2_is_bear & prev_is_bear & curr_is_bear & (prev_close < df_calc['close'].shift(2)) & (df_calc['close'] < prev_close)

    patterns = []
    for i in range(len(df_calc)):
        if is_morning_star.iloc[i]: patterns.append({"name": "Morning Star", "strength": 90, "type": "bullish", "description": "Strong 3-candle bullish reversal."})
        elif is_evening_star.iloc[i]: patterns.append({"name": "Evening Star", "strength": 90, "type": "bearish", "description": "Strong 3-candle bearish reversal."})
        elif is_3ws.iloc[i]: patterns.append({"name": "Three White Soldiers", "strength": 88, "type": "bullish", "description": "Strong sustained buying pressure across 3 candles."})
        elif is_3bc.iloc[i]: patterns.append({"name": "Three Black Crows", "strength": 88, "type": "bearish", "description": "Strong sustained selling pressure across 3 candles."})
        elif is_bullish_engulfing.iloc[i]: patterns.append({"name": "Bullish Engulfing", "strength": 85, "type": "bullish", "description": "Strong bullish momentum absorbing prior selling."})
        elif is_bearish_engulfing.iloc[i]: patterns.append({"name": "Bearish Engulfing", "strength": 85, "type": "bearish", "description": "Strong bearish momentum absorbing prior buying."})
        elif is_tweezer_bottom.iloc[i]: patterns.append({"name": "Tweezer Bottom", "strength": 82, "type": "bullish", "description": "Double-bottom price rejection — strong support."})
        elif is_tweezer_top.iloc[i]: patterns.append({"name": "Tweezer Top", "strength": 82, "type": "bearish", "description": "Double-top price rejection — strong resistance."})
        elif is_pin_bar_bull.iloc[i]: patterns.append({"name": "Bullish Pin Bar", "strength": 80, "type": "bullish", "description": "Long lower wick — strong rejection of lower prices."})
        elif is_pin_bar_bear.iloc[i]: patterns.append({"name": "Bearish Pin Bar", "strength": 80, "type": "bearish", "description": "Long upper wick — strong rejection of higher prices."})
        elif is_bullish_harami.iloc[i]: patterns.append({"name": "Bullish Harami", "strength": 70, "type": "bullish", "description": "Inside candle after bearish move — potential reversal."})
        elif is_bearish_harami.iloc[i]: patterns.append({"name": "Bearish Harami", "strength": 70, "type": "bearish", "description": "Inside candle after bullish move — potential reversal."})
        elif is_hammer.iloc[i]: patterns.append({"name": "Hammer", "strength": 75, "type": "bullish", "description": "Bullish rejection of lower prices."})
        elif is_shooting_star.iloc[i]: patterns.append({"name": "Shooting Star", "strength": 75, "type": "bearish", "description": "Bearish rejection of higher prices."})
        elif is_inside_bar.iloc[i]: patterns.append({"name": "Inside Bar", "strength": 60, "type": "neutral", "description": "Consolidation — breakout imminent."})
        elif is_inverted_hammer.iloc[i]: patterns.append({"name": "Inverted Hammer", "strength": 65, "type": "bullish", "description": "Potential bullish reversal — needs confirmation."})
        elif is_doji.iloc[i]: patterns.append({"name": "Doji", "strength": 50, "type": "neutral", "description": "Market indecision."})
        else: patterns.append({"name": "None", "strength": 0, "type": "neutral", "description": "No significant pattern."})
        
    df_calc['Candlestick_Pattern'] = patterns

    # ATR-based Stop Loss
    if 'ATR' in df_calc.columns:
        df_calc['ATR_SL_Long'] = df_calc['close'] - (1.5 * df_calc['ATR'])
        df_calc['ATR_SL_Short'] = df_calc['close'] + (1.5 * df_calc['ATR'])

    # --- MARKET STRUCTURE ---
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
        if adx_val > 40: return "Very Strong"
        if adx_val > 25: return "Strong"
        if adx_val > 20: return "Weak"
        return "None"
    df_calc['Trend_Strength'] = df_calc['ADX'].apply(determine_trend) if 'ADX' in df_calc.columns else "Unknown"

    # --- FIBONACCI RETRACEMENTS (based on 50-period High/Low) ---
    highest_50 = df_calc['high'].rolling(window=50).max()
    lowest_50 = df_calc['low'].rolling(window=50).min()
    fib_range = highest_50 - lowest_50
    df_calc['Fib_0.236'] = highest_50 - (fib_range * 0.236)
    df_calc['Fib_0.382'] = highest_50 - (fib_range * 0.382)
    df_calc['Fib_0.500'] = highest_50 - (fib_range * 0.5)
    df_calc['Fib_0.618'] = highest_50 - (fib_range * 0.618)
    df_calc['Fib_0.786'] = highest_50 - (fib_range * 0.786)

    # Fibonacci Proximity: Is current price near a key Fib level? (within 0.5% ATR distance)
    def fib_proximity(row):
        price = row.get('close', 0)
        atr = row.get('ATR', 1) or 1
        threshold = atr * 0.5
        fib_names = {
            'Fib_0.236': row.get('Fib_0.236'),
            'Fib_0.382': row.get('Fib_0.382'),
            'Fib_0.500': row.get('Fib_0.500'),
            'Fib_0.618': row.get('Fib_0.618'),
            'Fib_0.786': row.get('Fib_0.786'),
        }
        for name, level in fib_names.items():
            if level and abs(price - level) <= threshold:
                return name.replace("Fib_", "")
        return None

    # Apply only to the last row efficiently
    latest_close = df_calc['close'].iloc[-1]
    latest_atr = df_calc['ATR'].iloc[-1] if 'ATR' in df_calc.columns else 1
    fib_proximity_result = None
    if latest_atr and not pd.isna(latest_atr):
        threshold = latest_atr * 0.5
        for fib_name in ['Fib_0.236', 'Fib_0.382', 'Fib_0.500', 'Fib_0.618', 'Fib_0.786']:
            fib_val = df_calc[fib_name].iloc[-1] if fib_name in df_calc.columns else None
            if fib_val and not pd.isna(fib_val) and abs(latest_close - fib_val) <= threshold:
                fib_proximity_result = fib_name.replace("Fib_", "")
                break

    # --- SMART MONEY CONCEPTS (SMC) & ICT ---
    # Order Blocks (OB)
    df_calc['Body'] = abs(df_calc['close'] - df_calc['open'])
    df_calc['Avg_Body'] = df_calc['Body'].rolling(window=20).mean()
    is_strong_bullish = (df_calc['close'] > df_calc['open']) & (df_calc['Body'] > (df_calc['Avg_Body'] * 1.5))
    is_strong_bearish = (df_calc['close'] < df_calc['open']) & (df_calc['Body'] > (df_calc['Avg_Body'] * 1.5))
    
    bullish_ob_active = (df_calc['close'].shift(1) < df_calc['open'].shift(1)) & is_strong_bullish
    bearish_ob_active = (df_calc['close'].shift(1) > df_calc['open'].shift(1)) & is_strong_bearish
    df_calc['Bullish_OB'] = bullish_ob_active
    df_calc['Bearish_OB'] = bearish_ob_active

    # Fair Value Gaps (FVG)
    df_calc['Bullish_FVG'] = df_calc['low'] > df_calc['high'].shift(2)
    df_calc['Bearish_FVG'] = df_calc['high'] < df_calc['low'].shift(2)
    df_calc['FVG_Present'] = df_calc['Bullish_FVG'] | df_calc['Bearish_FVG']

    # Breaker Blocks & Mitigation Blocks (Simplified)
    df_calc['Breaker_Block'] = (df_calc['HH_20'] > df_calc['Prev_HH_20']) & (df_calc['close'] < df_calc['LL_20'].shift(1))
    df_calc['Mitigation_Block'] = (df_calc['HH_20'] <= df_calc['Prev_HH_20']) & (df_calc['close'] < df_calc['LL_20'].shift(1))

    # Liquidity Zones (Sweeps)
    df_calc['Liquidity_Top'] = df_calc['high'].rolling(window=20).max() == df_calc['high'].rolling(window=40).max()
    df_calc['Liquidity_Bottom'] = df_calc['low'].rolling(window=20).min() == df_calc['low'].rolling(window=40).min()

    # Market Sessions (London, NY, Asian)
    if 'datetime' in df_calc.columns or isinstance(df_calc.index, pd.DatetimeIndex):
        try:
            idx = df_calc.index if isinstance(df_calc.index, pd.DatetimeIndex) else pd.to_datetime(df_calc['datetime'])
            hour = idx.hour
            df_calc['London_Session'] = (hour >= 8) & (hour < 16)
            df_calc['NY_Session'] = (hour >= 13) & (hour < 21)
            df_calc['Asian_Session'] = (hour >= 0) & (hour < 8)
        except Exception:
            df_calc['London_Session'] = False
            df_calc['NY_Session'] = False
            df_calc['Asian_Session'] = False
    else:
        df_calc['London_Session'] = False
        df_calc['NY_Session'] = False
        df_calc['Asian_Session'] = False

    # Risk Metrics
    df_calc['Suggested_Risk_Pct'] = 1.0  # Strict 1% risk per trade rule

    # --- BUILD OUTPUT DICT ---
    latest = df_calc.iloc[-1]

    indicators_dict = {
        # EMAs
        'EMA20': latest.get('EMA20'),
        'EMA50': latest.get('EMA50'),
        'EMA100': latest.get('EMA100'),
        'EMA200': latest.get('EMA200'),
        # Momentum
        'RSI': latest.get('RSI'),
        'MACD': latest.get('MACD'),
        'MACD_signal': latest.get('MACD_signal'),
        'MACD_hist': latest.get('MACD_hist'),
        'StochRSI_K': latest.get('StochRSI_K'),
        'StochRSI_D': latest.get('StochRSI_D'),
        'CCI': latest.get('CCI'),
        # Trend
        'ATR': latest.get('ATR'),
        'ADX': latest.get('ADX'),
        'VWAP': latest.get('VWAP'),
        'Trend_Strength': latest.get('Trend_Strength'),
        # Bands & Levels
        'BB_lower': latest.get('BB_lower'),
        'BB_upper': latest.get('BB_upper'),
        'Support': latest.get('Support'),
        'Resistance': latest.get('Resistance'),
        'Pivot': latest.get('Pivot'),
        'R1': latest.get('R1'),
        'S1': latest.get('S1'),
        'R2': latest.get('R2'),
        'S2': latest.get('S2'),
        'Volatility': latest.get('Volatility'),
        # Volume
        'OBV': latest.get('OBV'),
        'Volume_Surge': bool(latest.get('Volume_Surge')),
        'RVOL': latest.get('RVOL'),
        'Buying_Volume': latest.get('Buying_Volume'),
        'Selling_Volume': latest.get('Selling_Volume'),
        'Volume_Trend': latest.get('Volume_Trend'),
        # Chaikin Money Flow
        'CMF': latest.get('CMF'),
        'CMF_Signal': latest.get('CMF_Signal'),
        # Candlestick
        'Candlestick_Pattern': latest.get('Candlestick_Pattern'),
        # Trade Setup
        'ATR_SL_Long': latest.get('ATR_SL_Long'),
        'ATR_SL_Short': latest.get('ATR_SL_Short'),
        'Market_Structure': latest.get('Market_Structure'),
        'PA_EMA50_Dist_Pct': latest.get('PA_EMA50_Dist'),
        # Fibonacci
        'Fib_0_236': latest.get('Fib_0.236'),
        'Fib_0_382': latest.get('Fib_0.382'),
        'Fib_0_500': latest.get('Fib_0.500'),
        'Fib_0_618': latest.get('Fib_0.618'),
        'Fib_0_786': latest.get('Fib_0.786'),
        'Fib_Proximity': fib_proximity_result,  # e.g. "0.618" if near golden ratio
        # Institutional SMC/ICT
        'Bullish_OB': bool(latest.get('Bullish_OB')),
        'Bearish_OB': bool(latest.get('Bearish_OB')),
        'Bullish_FVG': bool(latest.get('Bullish_FVG')),
        'Bearish_FVG': bool(latest.get('Bearish_FVG')),
        'FVG_Present': bool(latest.get('FVG_Present')),
        'Breaker_Block': bool(latest.get('Breaker_Block')),
        'Mitigation_Block': bool(latest.get('Mitigation_Block')),
        'Liquidity_Top_Present': bool(latest.get('Liquidity_Top')),
        'Liquidity_Bottom_Present': bool(latest.get('Liquidity_Bottom')),
        # Sessions
        'London_Session': bool(latest.get('London_Session')),
        'NY_Session': bool(latest.get('NY_Session')),
        'Asian_Session': bool(latest.get('Asian_Session')),
        # Risk
        'Suggested_Risk_Pct': latest.get('Suggested_Risk_Pct')
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


def calculate_mtf_indicators(symbol: str) -> dict:
    """
    Fetches data across multiple timeframes and returns a structured MTF analysis dict.
    Used by the AI to get a complete multi-timeframe picture.
    """
    from services.data_service import get_mtf_data
    
    try:
        mtf_data = get_mtf_data(symbol)
    except Exception as e:
        return {"error": str(e)}

    result = {}

    for tf_name, df in mtf_data.items():
        if df is None or df.empty or len(df) < 30:
            result[tf_name] = {"trend": "Unknown", "rsi": None, "macd_bullish": None, "ema20_above_50": None}
            continue
        try:
            ind = calculate_indicators(df)
            close = df['close'].iloc[-1]
            ema20 = ind.get('EMA20')
            ema50 = ind.get('EMA50')
            ema200 = ind.get('EMA200')
            rsi = ind.get('RSI')
            macd = ind.get('MACD')
            macd_sig = ind.get('MACD_signal')

            # Determine trend
            if ema20 and ema50 and ema200 and close:
                if close > ema20 > ema50 > ema200:
                    trend = "Strong Bullish"
                elif close > ema50 and ema50 > ema200:
                    trend = "Bullish"
                elif close < ema20 < ema50 < ema200:
                    trend = "Strong Bearish"
                elif close < ema50 and ema50 < ema200:
                    trend = "Bearish"
                else:
                    trend = "Neutral"
            else:
                trend = "Unknown"

            result[tf_name] = {
                "trend": trend,
                "rsi": round(rsi, 2) if rsi else None,
                "macd_bullish": bool(macd > macd_sig) if (macd is not None and macd_sig is not None) else None,
                "ema20_above_50": bool(ema20 > ema50) if (ema20 and ema50) else None,
                "close": round(close, 4) if close else None,
                "ema20": round(ema20, 4) if ema20 else None,
                "ema50": round(ema50, 4) if ema50 else None,
                "ema200": round(ema200, 4) if ema200 else None,
                "market_structure": ind.get("Market_Structure", "Unknown"),
                "volume_surge": ind.get("Volume_Surge", False),
            }
        except Exception:
            result[tf_name] = {"trend": "Unknown", "rsi": None, "macd_bullish": None, "ema20_above_50": None}

    # Calculate alignment score: how many TFs are bullish
    bullish_count = sum(
        1 for tf in result.values()
        if isinstance(tf.get("trend"), str) and "Bullish" in tf.get("trend", "")
    )
    bearish_count = sum(
        1 for tf in result.values()
        if isinstance(tf.get("trend"), str) and "Bearish" in tf.get("trend", "")
    )
    result['alignment_score'] = bullish_count
    result['bearish_count'] = bearish_count

    # Convenience fields for AI prompt
    result['weekly_trend'] = result.get('weekly', {}).get('trend', 'Unknown')
    result['weekly_ema20_above_50'] = result.get('weekly', {}).get('ema20_above_50', False)
    result['daily_trend'] = result.get('daily', {}).get('trend', 'Unknown')
    result['daily_rsi'] = result.get('daily', {}).get('rsi', None)
    result['daily_macd_bullish'] = result.get('daily', {}).get('macd_bullish', None)
    result['h4_trend'] = result.get('h4', {}).get('trend', 'Unknown')
    result['h4_rsi'] = result.get('h4', {}).get('rsi', None)

    # Calculate session levels and sweeps for Forex/any symbol
    try:
        session_levels = calculate_session_levels(symbol)
        result['session_levels'] = session_levels
    except Exception:
        result['session_levels'] = {}

    return result


def calculate_session_levels(symbol: str) -> dict:
    """
    Fetches 1-hour historical data for the last 5 days and calculates:
    - Asian Session High/Low (00:00 - 08:00 UTC)
    - London Session High/Low (08:00 - 16:00 UTC)
    - New York Session High/Low (12:00 - 20:00 UTC)
    - Rejection sweeps: Has price swept (exceeded then closed inside) any of these levels?
    """
    from services.data_service import normalize_symbol
    import yfinance as yf
    
    symbol_normalized = normalize_symbol(symbol)
    try:
        ticker = yf.Ticker(symbol_normalized)
        # Fetch 5 days of 1-hour candles
        df_1h = ticker.history(period="5d", interval="1h")
        if df_1h.empty:
            return {}
            
        df_1h.reset_index(inplace=True)
        # Identify date column
        date_col = 'Date' if 'Date' in df_1h.columns else 'Datetime'
        df_1h = df_1h.rename(columns={date_col: 'time', 'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close'})
        df_1h['time'] = pd.to_datetime(df_1h['time'], utc=True)
        df_1h.set_index('time', inplace=True)
        
        # Extract hours
        asian_prices = df_1h[df_1h.index.hour.isin([0, 1, 2, 3, 4, 5, 6, 7])]
        london_prices = df_1h[df_1h.index.hour.isin([8, 9, 10, 11, 12, 13, 14, 15])]
        ny_prices = df_1h[df_1h.index.hour.isin([12, 13, 14, 15, 16, 17, 18, 19, 20])]
        
        levels = {}
        if not asian_prices.empty:
            levels["asian_high"] = float(asian_prices['high'].max())
            levels["asian_low"] = float(asian_prices['low'].min())
        if not london_prices.empty:
            levels["london_high"] = float(london_prices['high'].max())
            levels["london_low"] = float(london_prices['low'].min())
        if not ny_prices.empty:
            levels["ny_high"] = float(ny_prices['high'].max())
            levels["ny_low"] = float(ny_prices['low'].min())
            
        # Detect sweeps using the latest 1H close
        latest_close = float(df_1h['close'].iloc[-1])
        latest_high = float(df_1h['high'].iloc[-1])
        latest_low = float(df_1h['low'].iloc[-1])
        
        sweeps = []
        if "asian_high" in levels and latest_high > levels["asian_high"] and latest_close <= levels["asian_high"]:
            sweeps.append("Asian Session High Swept (Bearish)")
        if "asian_low" in levels and latest_low < levels["asian_low"] and latest_close >= levels["asian_low"]:
            sweeps.append("Asian Session Low Swept (Bullish)")
            
        if "london_high" in levels and latest_high > levels["london_high"] and latest_close <= levels["london_high"]:
            sweeps.append("London Session High Swept (Bearish)")
        if "london_low" in levels and latest_low < levels["london_low"] and latest_close >= levels["london_low"]:
            sweeps.append("London Session Low Swept (Bullish)")
            
        levels["sweeps"] = sweeps
        return levels
    except Exception as e:
        print(f"Error calculating session levels: {e}")
        return {}
