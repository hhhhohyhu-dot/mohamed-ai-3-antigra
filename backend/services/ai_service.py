import os
import json
import re
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenRouter client using the OpenAI SDK
api_key = os.getenv("OPENROUTER_API_KEY", "")
if api_key:
    client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "https://github.com/hhhhohyhu-dot/mohamed-ai-3-antigra",
            "X-Title": "Mohamed Z AI Trading"
        }
    )
    # Extensive list of free models to try in order (fallback chain)
    MODELS = [
        "google/gemini-2.0-flash-lite-preview-02-05:free",
        "google/gemini-2.0-pro-exp-02-05:free",
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1-distill-llama-70b:free",
        "deepseek/deepseek-r1:free",
        "deepseek/deepseek-chat:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "qwen/qwen-2.5-72b-instruct:free",
        "cognitivecomputations/dolphin3.0-r1-mistral-24b:free",
        "nousresearch/hermes-3-llama-3.1-405b:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "huggingfaceh4/zephyr-7b-beta:free",
        "openchat/openchat-7b:free",
        "gryphe/mythomax-l2-13b:free"
    ]
else:
    client = None
    MODELS = []


def _clean_json(text: str) -> str:
    """Remove markdown code block wrappers from AI response."""
    text = text.strip()
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def _call_ai(messages: list, use_json: bool = True, max_retries: int = 3) -> str:
    """
    Call OpenRouter API with automatic retry and model fallback.
    Retries on rate limit (429) errors with increasing delays.
    """
    if not client:
        raise Exception("OpenRouter API key not configured.")

    last_error = "Unknown error"
    for model in MODELS:
        for attempt in range(max_retries):
            try:
                kwargs = {
                    "model": model,
                    "messages": messages,
                }
                # We do not use response_format={"type": "json_object"} because many free OpenRouter models do not support it and throw 400 errors.
                # The system prompt and _clean_json will handle formatting.

                response = client.chat.completions.create(**kwargs)
                return response.choices[0].message.content.strip()
            except Exception as e:
                last_error = str(e)
                error_str = str(e)
                # If rate limited or server error, wait and retry
                if any(x in error_str.lower() for x in ["429", "rate", "502", "503", "busy", "timeout", "overloaded", "fetch"]):
                    wait_time = (attempt + 1) * 2  # 2s, 4s, 6s
                    time.sleep(wait_time)
                    continue
                # For any other error (400, 404, etc), break retry loop and try the next model immediately
                else:
                    break

    raise Exception(f"All AI models are currently busy or unavailable. Last error: {last_error}")


def analyze_sentiment(news_items: list) -> dict:
    """
    Analyzes sentiment based on recent news using OpenRouter.
    Returns both an overall score and per-article scores for richer UI display.
    """
    if not client:
        return {"score": 50, "summary": "OpenRouter API key not configured.", "label": "Neutral", "articles": []}

    if not news_items:
        return {"score": 50, "summary": "No recent news available.", "label": "Neutral", "articles": []}

    # Build article list for per-article scoring
    articles_text = "\n".join([
        f"{i+1}. \"{item.get('title', 'No title')}\""
        for i, item in enumerate(news_items[:8])
    ])

    messages = [
        {"role": "system", "content": "You are a 30-year veteran institutional trader and risk manager. Output only valid JSON."},
        {"role": "user", "content": f"""
    Analyze the sentiment of these recent financial news headlines from the perspective of an institutional trader.
    Look for smart money implications, earnings surprises, regulatory risks, and macro headwinds.

    Headlines (numbered):
    {articles_text}

    Respond ONLY with a valid JSON object (no markdown, no extra text) containing:
    - overall_score: integer 0-100 (0=very bearish, 100=very bullish)
    - overall_label: "Bullish", "Bearish", or "Neutral"
    - summary: 1 sentence of overall institutional sentiment
    - articles: array of objects, one per headline (same order as input), each with:
        - index: number (1-based)
        - score: integer 0-100
        - label: "Bullish", "Bearish", or "Neutral"
        - reason: 1 very short phrase explaining the sentiment (max 8 words)
    """}
    ]

    try:
        text = _call_ai(messages, use_json=True)
        text = _clean_json(text)
        result = json.loads(text)

        # Merge the per-article scores back with original news items
        articles_with_scores = []
        raw_articles = result.get("articles", [])
        for i, item in enumerate(news_items[:8]):
            article_sentiment = next((a for a in raw_articles if a.get("index") == i + 1), {})
            articles_with_scores.append({
                "title": item.get("title", ""),
                "link": item.get("link", item.get("url", "#")),
                "providerPublishTime": item.get("providerPublishTime"),
                "datetime": item.get("datetime"),
                "score": article_sentiment.get("score", 50),
                "label": article_sentiment.get("label", "Neutral"),
                "reason": article_sentiment.get("reason", ""),
            })

        return {
            "score": result.get("overall_score", 50),
            "label": result.get("overall_label", "Neutral"),
            "summary": result.get("summary", ""),
            "articles": articles_with_scores,
        }
    except Exception as e:
        return {"score": 50, "summary": f"Error analyzing sentiment: {str(e)}", "label": "Neutral", "articles": []}


def generate_trading_plan(symbol: str, indicators: dict, capital: float = None, mtf_data: dict = None, macro_context: dict = None) -> dict:
    """
    Generates AI Buy/Sell/Hold signals and a Trading Plan using OpenRouter.
    Now incorporates MTF analysis and macro environment context for higher accuracy.
    """
    if not client:
        return {
            "signal": "Hold",
            "explanation": "OpenRouter API key not configured.",
            "plan": None
        }

    capital_instruction = ""
    if capital is not None and capital > 0:
        capital_instruction = f"\n    USER CAPITAL: ${capital:.2f}\n    7. Position Sizing: Calculate the EXACT dollar amount to invest ('position_amount') using a strict max 2% risk rule based on the entry and stop-loss distance. Explain the math in 'position_size_rationale'."

    # Build MTF context string
    mtf_context_str = ""
    if mtf_data:
        mtf_context_str = f"""
    MULTI-TIMEFRAME ANALYSIS:
    - Weekly Trend: {mtf_data.get('weekly_trend', 'Unknown')} | Weekly EMA20 vs EMA50: {'Bullish' if mtf_data.get('weekly_ema20_above_50') else 'Bearish'}
    - Daily Trend: {mtf_data.get('daily_trend', 'Unknown')} | RSI Daily: {mtf_data.get('daily_rsi', 'N/A')} | MACD Daily: {mtf_data.get('daily_macd_bullish', 'Unknown')}
    - 4H Trend: {mtf_data.get('h4_trend', 'Unknown')} | RSI 4H: {mtf_data.get('h4_rsi', 'N/A')}
    - MTF Alignment Score: {mtf_data.get('alignment_score', 0)}/3 timeframes bullish
    """

    # Build Macro context string
    macro_context_str = ""
    if macro_context:
        macro_context_str = f"""
    MACRO ENVIRONMENT (Critical - adjust trade size accordingly):
    - Market Stress Index: {macro_context.get('stress_value', 50):.0f}/100 (Regime: {macro_context.get('stress_regime', 'NEUTRAL')})
    - VIX Z-Score: {macro_context.get('vix_zscore', 0):.2f} | DXY Momentum: {macro_context.get('dxy_momentum', 'Unknown')}
    - Active Divergences: {macro_context.get('divergence_count', 0)} alerts
    - Note: In RISK-OFF or EXTREME regimes, reduce position size by 50% and tighten stops.
    """

    # Build Fibonacci proximity
    fib_levels = {k: v for k, v in indicators.items() if k.startswith("Fib_")}
    fib_str = ""
    if fib_levels:
        fib_str = "\n    FIBONACCI LEVELS: " + ", ".join([f"{k.replace('Fib_', 'Fib ')}: {v:.2f}" for k, v in fib_levels.items() if v])

    messages = [
        {"role": "system", "content": "You are a 30-year veteran institutional trader and risk manager. You prioritize capital preservation, smart money concepts, and strict risk management. Output only valid JSON."},
        {"role": "user", "content": f"""
    You are a 30-year veteran institutional trader analyzing {symbol}.
    Based on the following live technical indicators, generate a professional, high-probability trading analysis.
    Do NOT use fake data, base your decision purely on the provided indicators.

    TECHNICAL INDICATORS:
    {json.dumps(indicators, indent=2)}
    {fib_str}
    {mtf_context_str}
    {macro_context_str}

    CRITICAL INSTRUCTIONS FOR ANALYSIS:
    1. Institutional Order Flow: Check 'Bullish_OB', 'Bearish_OB', and Liquidity markers. Smart money hunts liquidity.
    2. Market Structure: Consider the 'Market_Structure' (e.g., Bullish HH/HL vs Bearish LH/LL). Trade with the trend.
    3. Fibonacci Levels: Identify where price is relative to the provided Fib levels for pullbacks.
    4. Risk Management: Heed the 'Suggested_Risk_Pct' and use ATR for Stop Loss. Capital preservation is key.
    5. Candlestick & Volume: Confirm entries with 'Candlestick_Pattern' and 'Volume_Surge'.
    6. MTF Confluence: Only take high-conviction trades where at least 2 of 3 timeframes agree.{capital_instruction}

    Respond ONLY with a valid JSON object (no markdown, no extra text) with:
    - signal: "Buy", "Sell", or "Hold"
    - confidence_score: integer 0-100 representing your conviction level (used by Risk Engine)
    - explanation: A detailed 3-5 sentence explanation based on the indicators, explicitly mentioning Order Blocks, Liquidity, Market Structure, and MTF alignment.
    - institutional_perspective: A 1-2 sentence view on what "smart money" might be doing right now.
    - risk_warning: A 1 sentence warning about potential pitfalls or invalidation levels for this setup.
    - key_levels: object with `strong_support`, `strong_resistance`, `invalidation` price levels (floats)
    - plan: An object with (if signal is Buy or Sell, else null):
        - entry: suggested entry price (often near an OB or Fib level)
        - sl: Use the exact value from 'ATR_SL_Long' or 'ATR_SL_Short', or adapt slightly around liquidity.
        - tp1: take profit 1 (nearest resistance/liquidity)
        - tp2: take profit 2 (next key level)
        - tp3: take profit 3 (extended target)
        - risk_reward: risk/reward ratio as a string (e.g., "1:2.5")
        - position_amount: Exact dollar amount to invest (if capital is provided, else null)
        - position_size_rationale: 1-sentence explanation of the math
        - partial_exit_plan: string — when to take partial profits (e.g., "Close 50% at TP1, trail stop to entry")
    - forecast: An object containing:
        - tomorrow: object with `trend` ("Bullish", "Bearish", "Neutral") and `confidence` (0-100) and `reason` (1 short phrase)
        - week: object with `trend` ("Bullish", "Bearish", "Neutral") and `confidence` (0-100) and `reason` (1 short phrase)
        - month: object with `trend` ("Bullish", "Bearish", "Neutral") and `confidence` (0-100) and `reason` (1 short phrase)
    """}
    ]

    try:
        text = _call_ai(messages, use_json=True)
        text = _clean_json(text)
        return json.loads(text)
    except Exception as e:
        return {
            "signal": "Error",
            "explanation": f"AI analysis failed: {str(e)}",
            "plan": None
        }


def chat_with_ai(symbol: str, message: str, context: dict) -> dict:
    """
    Handles user chat inquiries with full trading context:
    price, indicators, current trade plan, risk engine signal, and MTF data.
    """
    if not client:
        return {"response": "OpenRouter API key not configured. Cannot chat."}

    # Build rich context string
    trade_plan_str = ""
    if context.get("trade_plan"):
        plan = context["trade_plan"]
        trade_plan_str = f"""
    CURRENT TRADE PLAN (AI Generated):
    - Signal: {context.get('signal', 'Unknown')}
    - Entry: {plan.get('entry', 'N/A')} | SL: {plan.get('sl', 'N/A')} | TP1: {plan.get('tp1', 'N/A')} | TP2: {plan.get('tp2', 'N/A')}
    - Risk/Reward: {plan.get('risk_reward', 'N/A')}
    - Partial Exit: {plan.get('partial_exit_plan', 'N/A')}
    """

    risk_engine_str = ""
    if context.get("risk_engine_result"):
        re = context["risk_engine_result"]
        risk_engine_str = f"""
    RISK ENGINE VERDICT: {'✅ APPROVED' if re.get('approved') else '❌ REJECTED'}
    - Reason: {re.get('reason', 'N/A')}
    - R/R Ratio: {re.get('risk_reward_ratio', 'N/A')} | Trade Quality: {re.get('trade_quality', 'N/A')}
    """

    mtf_str = ""
    if context.get("mtf"):
        mtf = context["mtf"]
        mtf_str = f"""
    MULTI-TIMEFRAME CONTEXT:
    - Weekly: {mtf.get('weekly_trend', 'Unknown')} | Daily: {mtf.get('daily_trend', 'Unknown')} | 4H: {mtf.get('h4_trend', 'Unknown')}
    - MTF Alignment: {mtf.get('alignment_score', 0)}/3 bullish
    """

    messages = [
        {"role": "system", "content": "You are a 30-year veteran institutional trader and risk manager. You give concise, high-value, no-nonsense trading insights. You always relate your answers back to the specific chart context provided."},
        {"role": "user", "content": f"""
    You are mentoring a trader on {symbol} at price {context.get('price', 'N/A')}.

    TECHNICAL INDICATORS SUMMARY:
    RSI: {context.get('indicators', {}).get('RSI', 'N/A')} | MACD: {context.get('indicators', {}).get('MACD', 'N/A')} | ATR: {context.get('indicators', {}).get('ATR', 'N/A')}
    EMA20: {context.get('indicators', {}).get('EMA20', 'N/A')} | EMA50: {context.get('indicators', {}).get('EMA50', 'N/A')} | EMA200: {context.get('indicators', {}).get('EMA200', 'N/A')}
    Market Structure: {context.get('indicators', {}).get('Market_Structure', 'N/A')}
    Volume Surge: {context.get('indicators', {}).get('Volume_Surge', 'N/A')}
    Bullish OB: {context.get('indicators', {}).get('Bullish_OB', 'N/A')} | Bearish OB: {context.get('indicators', {}).get('Bearish_OB', 'N/A')}
    {trade_plan_str}
    {risk_engine_str}
    {mtf_str}

    User's Question: {message}

    Respond professionally, concisely, and with the wisdom of a seasoned trader. Be specific with numbers and levels from the context above. Prioritize capital preservation and smart money concepts.
    """}
    ]

    try:
        text = _call_ai(messages, use_json=False)
        return {"response": text}
    except Exception as e:
        return {"response": f"Chat failed: {str(e)}"}


def generate_macro_commentary(macro_data: dict) -> dict:
    """
    Generates an AI-powered textual commentary on the current macro environment.
    Provides actionable insights for equity and forex traders.
    """
    if not client:
        return {"commentary": "OpenRouter API key not configured.", "bias": "Neutral", "risk_level": "Medium"}

    if not macro_data or not macro_data.get("indicators"):
        return {"commentary": "No macro data available.", "bias": "Neutral", "risk_level": "Medium"}

    # Summarize macro data for the prompt
    indicators = macro_data.get("indicators", {})
    stress = macro_data.get("stress_index", {})
    divergences = macro_data.get("divergences", [])

    indicator_summary = "\n".join([
        f"- {name}: Price={d.get('price', 0):.2f}, Z-Score={d.get('z_score', 0):.2f} ({d.get('regime', 'NORMAL')}), Change={d.get('change_pct', 0):.2f}%"
        for name, d in indicators.items()
    ])

    divergence_summary = "\n".join([f"- {d.get('code')}: {d.get('desc')}" for d in divergences]) if divergences else "None detected."

    messages = [
        {"role": "system", "content": "You are a top-tier macro strategist at a major hedge fund. Output only valid JSON."},
        {"role": "user", "content": f"""
    Analyze the current macro market environment and generate a professional commentary for traders.

    MACRO INDICATORS:
    {indicator_summary}

    STRESS INDEX: {stress.get('value', 50):.0f}/100 (Regime: {stress.get('regime', 'NEUTRAL')})

    INTERMARKET DIVERGENCES:
    {divergence_summary}

    Based on this data, respond ONLY with a valid JSON object containing:
    - commentary: A professional 3-4 sentence macro analysis. Mention specific indicators. Give clear directional bias.
    - bias: "Risk-On", "Risk-Off", or "Neutral"
    - risk_level: "Low", "Medium", "High", or "Extreme"
    - key_theme: A 1 sentence description of the dominant market theme right now (e.g., "Flight to safety as yields surge")
    - actionable_insight: 1-2 sentences on what traders should do given this macro backdrop
    """}
    ]

    try:
        text = _call_ai(messages, use_json=True)
        text = _clean_json(text)
        return json.loads(text)
    except Exception as e:
        return {
            "commentary": f"Macro commentary generation failed: {str(e)}",
            "bias": "Neutral",
            "risk_level": "Medium",
            "key_theme": "Unable to assess",
            "actionable_insight": "Please try again."
        }
