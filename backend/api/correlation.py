from fastapi import APIRouter
from services.correlation_service import calculate_forex_correlation

router = APIRouter()

@router.get("/")
def get_correlation():
    """
    Returns Pearson correlation matrix of major currency pairs returns.
    """
    try:
        corr_data = calculate_forex_correlation()
        return corr_data
    except Exception as e:
        return {"status": "error", "message": str(e), "matrix": {}, "pairs": []}
