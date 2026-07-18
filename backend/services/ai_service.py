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
                error_str = str(e)
                # If rate limited or server error, wait and retry
                if any(x in error_str.lower() for x in ["429", "rate", "502", "503", "busy", "timeout", "overloaded", "fetch"]):
                    wait_time = (attempt + 1) * 2  # 2s, 4s, 6s
                    time.sleep(wait_time)
                    continue
                # For any other error (400, 404, etc), break retry loop and try the next model immediately
                else:
                    break
    
    raise Exception(f"All AI models are currently busy or unavailable. Last error: {error_str}")


def analyze_sentiment(news_items: list) -> dict:
    """
    Analyzes sentiment based on recent news using OpenRouter.
    """
    if not client:
        return {"score": 50, "summary": "OpenRouter API key not configured.", "label": "Neutral"}

    if not news_items:
        return {"score": 50, "summary": "No recent news available.", "label": "Neutral"}

    news_text = "\n".join([f"- {item.get('title', '')}" for item in news_items[:5]])

    messages = [
        {"role": "system", "content": "You are a 30-year veteran institutional trader and risk manager. Output only valid JSON."},
        {"role": "user", "content": f"""
    Analyze the sentiment of the following recent news headlines for a financial asset from the perspective of an institutional trader. Look for smart money implications.
    Respond ONLY with a valid JSON object (no markdown, no extra text) with these fields:
    - score: integer 0 to 100 (0=very bearish, 100=very bullish)
    - summary: A 1-sentence explanation of institutional sentiment.
    - label: "Bullish", "Bearish", or "Neutral"

    News:
    {news_text}
    """}
    ]

    try:
        text = _call_ai(messages, use_json=True)
        text = _clean_json(text)
        return json.loads(text)
    except Exception as e:
        return {"score": 50, "summary": f"Error analyzing sentiment: {str(e)}", "label": "Neutral"}


def generate_trading_plan(symbol: str, indicators: dict, capital: float = None) -> dict:
    """
    Generates AI Buy/Sell/Hold signals and a Trading Plan using OpenRouter.
    """
    if not client:
        return {
            "signal": "Hold",
            "explanation": "OpenRouter API key not configured.",
            "plan": None
        }

    capital_instruction = ""
    if capital is not None and capital > 0:
        capital_instruction = f"\n    USER CAPITAL: ${capital:.2f}\n    6. Position Sizing: Since the user provided their capital (${capital:.2f}), calculate the EXACT dollar amount to invest ('position_amount') using a strict max 2% risk rule based on the entry and stop-loss distance. Explain the math in 'position_size_rationale'."


    messages = [
        {"role": "system", "content": "You are a 30-year veteran institutional trader and risk manager. You prioritize capital preservation, smart money concepts, and strict risk management. Output only valid JSON."},
        {"role": "user", "content": f"""
    You are a 30-year veteran institutional trader analyzing {symbol}.
    Based on the following live technical indicators, generate a professional, high-probability trading analysis.
    Do NOT use fake data, base your decision purely on the provided indicators.

    Indicators:
    {json.dumps(indicators, indent=2)}

    CRITICAL INSTRUCTIONS FOR ANALYSIS:
    1. Institutional Order Flow: Check 'Bullish_OB', 'Bearish_OB', and Liquidity markers. Smart money hunts liquidity.
    2. Market Structure: Consider the 'Market_Structure' (e.g., Bullish HH/HL vs Bearish LH/LL). Trade with the trend.
    3. Fibonacci Levels: Identify where price is relative to the provided Fib levels for pullbacks.
    4. Risk Management: Heed the 'Suggested_Risk_Pct' and use ATR for Stop Loss. Capital preservation is key.
    5. Candlestick & Volume: Confirm entries with 'Candlestick_Pattern' and 'Volume_Surge'.{capital_instruction}

    Respond ONLY with a valid JSON object (no markdown, no extra text) with:
    - signal: "Buy", "Sell", or "Hold"
    - explanation: A detailed 2-4 sentence explanation based on the indicators, explicitly mentioning Order Blocks, Liquidity, and Market Structure.
    - institutional_perspective: A 1-2 sentence view on what "smart money" might be doing right now.
    - risk_warning: A 1 sentence warning about potential pitfalls or invalidation levels for this setup.
    - plan: An object with (if signal is Buy or Sell, else null):
        - entry: suggested entry price (often near an OB or Fib level)
        - sl: Use the exact value from 'ATR_SL_Long' or 'ATR_SL_Short', or adapt slightly around liquidity.
        - tp1: take profit 1
        - tp2: take profit 2
        - tp3: take profit 3
        - risk_reward: risk/reward ratio as a string (e.g., "1:2")
        - position_amount: Exact dollar amount to invest (if capital is provided, else null)
        - position_size_rationale: 1-sentence explanation of the math (e.g., "2% risk of $1000 is $20. With a 5% stop loss, you can invest $400.")
    - forecast: An object containing:
        - tomorrow: object with `trend` ("Bullish", "Bearish", "Neutral") and `confidence` (0-100)
        - week: object with `trend` ("Bullish", "Bearish", "Neutral") and `confidence` (0-100)
        - month: object with `trend` ("Bullish", "Bearish", "Neutral") and `confidence` (0-100)
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
    Handles user chat inquiries with context of the current symbol using OpenRouter.
    """
    if not client:
        return {"response": "OpenRouter API key not configured. Cannot chat."}

    messages = [
        {"role": "system", "content": "You are a 30-year veteran institutional trader and risk manager. You give no-nonsense, highly experienced trading advice."},
        {"role": "user", "content": f"""
    You are a veteran trader with 30 years of institutional experience, mentoring the user on {symbol}.
    The user is asking a question about {symbol} or trading in general.
    You have the following live technical context (current price, indicators):
    {json.dumps(context, indent=2)}

    User Message: {message}

    Respond professionally, concisely, and with the wisdom of a seasoned trader who prioritizes capital preservation and smart money concepts.
    """}
    ]

    try:
        text = _call_ai(messages, use_json=False)
        return {"response": text}
    except Exception as e:
        return {"response": f"Chat failed: {str(e)}"}
