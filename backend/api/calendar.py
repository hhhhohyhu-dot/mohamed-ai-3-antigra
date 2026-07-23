from fastapi import APIRouter
from services.calendar_service import get_economic_calendar

router = APIRouter()

@router.get("/")
def get_calendar():
    """
    Returns the economic calendar events with calculated minutes to event.
    """
    try:
        events = get_economic_calendar()
        return {"status": "success", "events": events}
    except Exception as e:
        return {"status": "error", "message": str(e), "events": []}
