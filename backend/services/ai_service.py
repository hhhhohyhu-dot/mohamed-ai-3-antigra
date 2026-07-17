import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Initialize Gemini client
api_key = os.getenv("GEMINI_API_KEY", "")
client_configured = False
if api_key:
    genai.configure(api_key=api_key)
    # Using gemini-1.5-flash as the recommended model for text and fast responses
    model = genai.GenerativeModel('gemini-1.5-flash')
    client_configured = True
else:
    model = None


def analyze_sentiment(news_items: list) -> dict:
    """
    Analyzes sentiment based on recent news using Gemini.
    """
    if not client_configured:
        return {"score": 50, "summary": "Gemini API key not configured.", "label": "Neutral"}

    if not news_items:
        return {"score": 50, "summary": "No recent news available.", "label": "Neutral"}

    news_text = "\n".join([f"- {item.get('title', '')}" for item in news_items[:5]])

    prompt = f"""
    Analyze the sentiment of the following recent news headlines for a financial asset.
    Respond ONLY with a valid JSON object (no markdown, no extra text, no json codeblocks) with these fields:
    - score: integer 0 to 100 (0=very bearish, 100=very bullish)
    - summary: A 1-sentence explanation.
    - label: "Bullish", "Bearish", or "Neutral"

    News:
    {news_text}
    """

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        text = response.text.strip()
        return json.loads(text)
    except Exception as e:
        return {"score": 50, "summary": f"Error analyzing sentiment: {str(e)}", "label": "Neutral"}


def generate_trading_plan(symbol: str, indicators: dict) -> dict:
    """
    Generates AI Buy/Sell/Hold signals and a Trading Plan using Gemini.
    """
    if not client_configured:
        return {
            "signal": "Hold",
            "explanation": "Gemini API key not configured.",
            "plan": None
        }

    prompt = f"""
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

    Respond ONLY with a valid JSON object (no markdown, no extra text, no json codeblocks) with:
    - signal: "Buy", "Sell", or "Hold"
    - explanation: A detailed 2-4 sentence explanation based on the indicators, explicitly mentioning Market Structure, Volume, Candlestick Patterns, and MTF trend if relevant.
    - plan: An object with (if signal is Buy or Sell):
        - entry: suggested entry price
        - sl: Use the exact value from 'ATR_SL_Long' (if Buy) or 'ATR_SL_Short' (if Sell), or adapt slightly around it.
        - tp1: take profit 1
        - tp2: take profit 2
        - tp3: take profit 3
        - risk_reward: risk/reward ratio as a string (e.g., "1:2")
    """

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(response_mime_type="application/json")
        )
        text = response.text.strip()
        return json.loads(text)
    except Exception as e:
        return {
            "signal": "Error",
            "explanation": f"AI analysis failed: {str(e)}",
            "plan": None
        }


def chat_with_ai(symbol: str, message: str, context: dict) -> dict:
    """
    Handles user chat inquiries with context of the current symbol using Gemini.
    """
    if not client_configured:
        return {"response": "Gemini API key not configured. Cannot chat."}

    prompt = f"""
    You are a professional AI trading assistant for {symbol}.
    The user is asking a question about {symbol} or trading in general.
    You have the following live technical context (current price, indicators):
    {json.dumps(context, indent=2)}

    User Message: {message}

    Respond professionally and concisely.
    """

    try:
        response = model.generate_content(prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        return {"response": f"Chat failed: {str(e)}"}
