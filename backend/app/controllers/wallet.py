
from fastapi import APIRouter

router = APIRouter()

@router.get("/balance")
def get_balance():
    return {"balance": "connected-to-node"}

@router.post("/transfer")
def transfer():
    return {"status": "signed-and-broadcasted"}
