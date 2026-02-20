
from fastapi import APIRouter

router = APIRouter()

@router.post("/order")
def place_order():
    return {"order": "spot-order-executed"}

@router.get("/orderbook")
def orderbook():
    return {"orderbook": "live-liquidity-stream"}
