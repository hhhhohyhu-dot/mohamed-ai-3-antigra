from fastapi import APIRouter
from services.macro_service import get_macro_data
from services.ai_service import generate_macro_commentary

router = APIRouter()

@router.get("/commentary")
def get_macro_commentary():
    """
    Generates an AI-powered macro commentary on current market conditions.
    Calls get_macro_data() then passes it to the LLM for analysis.
    """
    macro_data = get_macro_data()
    commentary = generate_macro_commentary(macro_data)
    return commentary
