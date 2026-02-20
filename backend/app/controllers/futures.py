
from fastapi import APIRouter

router = APIRouter()

@router.post("/open-position")
def open_position():
    return {"position": "futures-position-opened"}

@router.post("/close-position")
def close_position():
    return {"position": "futures-position-closed"}

@router.get("/funding-rate")
def funding_rate():
    return {"funding": "calculated-rate"}
