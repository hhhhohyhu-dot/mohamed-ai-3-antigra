from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import math
import json
from dotenv import load_dotenv
load_dotenv()
import asyncio
from api import dashboard, chart, analyze, news, indicators, sentiment, chat, macro, macro_ai, options, trades, auth, ws, backtest, calendar, correlation
from database import engine, Base

class SafeJSONResponse(JSONResponse):
    """JSONResponse that converts NaN/Infinity to None for JSON compliance."""
    def render(self, content) -> bytes:
        def sanitize(obj):
            if isinstance(obj, float):
                if math.isnan(obj) or math.isinf(obj):
                    return None
                return obj
            if isinstance(obj, dict):
                return {k: sanitize(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [sanitize(i) for i in obj]
            return obj
        return json.dumps(sanitize(content), ensure_ascii=False).encode("utf-8")


app = FastAPI(
    title="Mohamed Z AI Trading Platform",
    version="1.0.0",
    default_response_class=SafeJSONResponse
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create database tables if they don't exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created successfully!")
    except Exception as e:
        print(f"DATABASE CONNECTION ERROR: {e}")
        print("Continuing without database initialization to allow debugging...")
        
    # Start the WebSocket live data streamer in background
    import os
    print("DEBUG: OPENROUTER_API_KEY in main startup:", "configured" if os.environ.get("OPENROUTER_API_KEY") else "empty")
    asyncio.create_task(ws.stream_live_data())

@app.get("/health")
def health_check():
    return {"status": "ok"}

import os
from fastapi.staticfiles import StaticFiles

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(chart.router, prefix="/api/chart", tags=["Chart"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analyze"])
app.include_router(news.router, prefix="/api/news", tags=["News"])
app.include_router(indicators.router, prefix="/api/indicators", tags=["Indicators"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["Sentiment"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(macro.router, prefix="/api/macro", tags=["Macro"])
app.include_router(macro_ai.router, prefix="/api/macro", tags=["Macro AI"])
app.include_router(options.router, prefix="/api/options", tags=["Options"])
app.include_router(trades.router, prefix="/api/trades", tags=["Trades"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(ws.router, prefix="/ws", tags=["WebSockets"])
app.include_router(backtest.router, prefix="/api/backtest", tags=["Backtest"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(correlation.router, prefix="/api/correlation", tags=["Correlation"])


# Mount the static Next.js frontend UI
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    # Fallback to local 'static' if run from backend folder directly
    if os.path.exists("static"):
        app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
