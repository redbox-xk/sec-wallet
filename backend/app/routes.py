
from fastapi import APIRouter
from app.controllers import wallet, trading, futures

router = APIRouter()

router.include_router(wallet.router, prefix="/wallet")
router.include_router(trading.router, prefix="/spot")
router.include_router(futures.router, prefix="/futures")
