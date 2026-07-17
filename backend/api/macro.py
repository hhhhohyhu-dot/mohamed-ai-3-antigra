from fastapi import APIRouter
from services.macro_service import get_macro_data

router = APIRouter()

@router.get("/")
def get_macro():
    data = get_macro_data()
    return data
