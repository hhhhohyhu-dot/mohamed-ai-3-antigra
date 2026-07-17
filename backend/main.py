from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import math
import json
from dotenv import load_dotenv
load_dotenv()
from api import dashboard, chart, analyze, news, indicators, sentiment, chat


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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(chart.router, prefix="/api/chart", tags=["Chart"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analyze"])
app.include_router(news.router, prefix="/api/news", tags=["News"])
app.include_router(indicators.router, prefix="/api/indicators", tags=["Indicators"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["Sentiment"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
