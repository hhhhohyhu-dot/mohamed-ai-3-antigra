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
        base_url="https://openrouter.ai/api/v1"
    )
    # Free models to try in order (fallback chain)
    MODELS = [
        "meta-llama/llama-4-scout:free",
        "meta-llama/llama-3.3-70b-instruct:free",
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
                if use_json:
                    kwargs["response_format"] = {"type": "json_object"}

                response = client.chat.completions.create(**kwargs)
                return response.choices[0].message.content.strip()
            except Exception as e:
                error_str = str(e)
                # If rate limited, wait and retry
                if "429" in error_str or "rate" in error_str.lower():
                    wait_time = (attempt + 1) * 3  # 3s, 6s, 9s
                    time.sleep(wait_time)
                    continue
                # If model not found, try next model
                elif "404" in error_str:
                    break
                else:
                    raise e
    raise Exception("All AI models are currently busy. Please try again in a moment.")


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
        {"role": "system", "content": "You are a helpful financial sentiment analyzer. Output only valid JSON."},
        {"role": "user", "content": f"""
    Analyze the sentiment of the following recent news headlines for a financial asset.
    Respond ONLY with a valid JSON object (no markdown, no extra text) with these fields:
    - score: integer 0 to 100 (0=very bearish, 100=very bullish)
    - summary: A 1-sentence explanation.
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


def generate_trading_plan(symbol: str, indicators: dict) -> dict:
    """
    Generates AI Buy/Sell/Hold signals and a Trading Plan using OpenRouter.
    """
    if not client:
        return {
            "signal": "Hold",
            "explanation": "OpenRouter API key not configured.",
            "plan": None
        }

    messages = [
        {"role": "system", "content": "You are a professional AI trading assistant. Output only valid JSON."},
        {"role": "user", "content": f"""
    You are a professional AI trading assistant for {symbol}.
    Based on the following live technical indicators, generate a professional trading analysis.
    Do NOT use fake data, base your decision purely on the provided indicators.

    Indicators:
    {json.dumps(indicators, indent=2)}

    CRITICAL INSTRUCTIONS FOR ANALYSIS:
    1. Multi-Timeframe (MTF) Confirmation: Check 'MTF_Trend_Weekly'. Trade in the direction of the MTF trend when possible.
    2. Market Structure: Consider the 'Market_Structure' (e.g., Bullish HH/HL vs Bearish LH/LL).
    3. Volume Confirmation: Look at 'Volume_Surge' to confirm if a breakout or trend has volume backing.
    4. Candlestick Patterns: 'Candlestick_Pattern' reveals short-term reversal or continuation signs.
    5. Price Action: 'PA_EMA50_Dist_Pct' indicates overextension.

    Respond ONLY with a valid JSON object (no markdown, no extra text) with:
    - signal: "Buy", "Sell", or "Hold"
    - explanation: A detailed 2-4 sentence explanation based on the indicators, explicitly mentioning Market Structure, Volume, Candlestick Patterns, and MTF trend if relevant.
    - plan: An object with (if signal is Buy or Sell, else null):
        - entry: suggested entry price
        - sl: Use the exact value from 'ATR_SL_Long' (if Buy) or 'ATR_SL_Short' (if Sell), or adapt slightly around it.
        - tp1: take profit 1
        - tp2: take profit 2
        - tp3: take profit 3
        - risk_reward: risk/reward ratio as a string (e.g., "1:2")
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
        {"role": "system", "content": "You are a professional AI trading assistant."},
        {"role": "user", "content": f"""
    You are a professional AI trading assistant for {symbol}.
    The user is asking a question about {symbol} or trading in general.
    You have the following live technical context (current price, indicators):
    {json.dumps(context, indent=2)}

    User Message: {message}

    Respond professionally and concisely.
    """}
    ]

    try:
        text = _call_ai(messages, use_json=False)
        return {"response": text}
    except Exception as e:
        return {"response": f"Chat failed: {str(e)}"}
