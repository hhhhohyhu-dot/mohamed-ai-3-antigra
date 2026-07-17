from fastapi import APIRouter
from services.options_service import get_options_data

router = APIRouter()

@router.get("/{symbol}")
def get_options(symbol: str):
    data = get_options_data(symbol)
    return data
