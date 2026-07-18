from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from pydantic import BaseModel
import datetime

from database import get_db
import models
from .auth import get_current_user

router = APIRouter()

class TradeCreate(BaseModel):
    symbol: str
    type: str
    volume: float
    entry_price: float

class TradeResponse(BaseModel):
    id: int
    symbol: str
    type: str
    volume: float
    entry_price: float
    is_open: bool
    pnl: float

    class Config:
        from_attributes = True

@router.post("/execute", response_model=TradeResponse)
async def execute_trade(trade: TradeCreate, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Deduct commission (simulated)
    commission = trade.entry_price * 0.0005 * trade.volume
    
    new_trade = models.Trade(
        user_id=current_user.id,
        symbol=trade.symbol,
        type=trade.type,
        volume=trade.volume,
        entry_price=trade.entry_price,
        pnl=-commission
    )
    
    db.add(new_trade)
    await db.commit()
    await db.refresh(new_trade)
    
    return new_trade

@router.post("/close/{trade_id}")
async def close_trade(trade_id: int, exit_price: float, db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = await db.execute(select(models.Trade).where(models.Trade.id == trade_id, models.Trade.user_id == current_user.id))
    trade = result.scalars().first()
    
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if not trade.is_open:
        raise HTTPException(status_code=400, detail="Trade already closed")
        
    # Calculate final PNL
    if trade.type == 'BUY':
        final_pnl = trade.pnl + (exit_price - trade.entry_price) * trade.volume
    else:
        final_pnl = trade.pnl + (trade.entry_price - exit_price) * trade.volume
        
    trade.is_open = False
    trade.exit_price = exit_price
    trade.closed_at = datetime.datetime.utcnow()
    trade.pnl = final_pnl
    
    # Update portfolio
    port_result = await db.execute(select(models.Portfolio).where(models.Portfolio.user_id == current_user.id))
    portfolio = port_result.scalars().first()
    if portfolio:
        portfolio.balance += final_pnl
        portfolio.equity += final_pnl
        
    await db.commit()
    return {"message": "Trade closed", "pnl": final_pnl}

@router.get("/active", response_model=List[TradeResponse])
async def get_active_trades(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = await db.execute(select(models.Trade).where(models.Trade.user_id == current_user.id, models.Trade.is_open == True))
    trades = result.scalars().all()
    return trades

@router.get("/history", response_model=List[TradeResponse])
async def get_history(db: AsyncSession = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = await db.execute(select(models.Trade).where(models.Trade.user_id == current_user.id, models.Trade.is_open == False))
    trades = result.scalars().all()
    return trades
