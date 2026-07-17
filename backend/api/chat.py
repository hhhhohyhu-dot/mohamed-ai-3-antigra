from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from services.ai_service import chat_with_ai

router = APIRouter()

class ChatRequest(BaseModel):
    symbol: str
    message: str
    context: Dict[str, Any]

@router.post("/")
def post_chat(request: ChatRequest):
    result = chat_with_ai(request.symbol, request.message, request.context)
    return {"symbol": request.symbol, "response": result.get("response")}
