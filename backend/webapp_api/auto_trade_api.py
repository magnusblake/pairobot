"""
API для управления автоматической торговлей
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from ..auto_trade_engine import auto_trade_engine
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["auto-trade"])


class AutoTradeToggleRequest(BaseModel):
    enabled: bool


class AutoTradeStatusResponse(BaseModel):
    enabled: bool
    active_strategies: int
    api_keys_configured: int
    last_trade: Optional[str] = None


@router.post("/auto-trade")
async def toggle_auto_trade(
    request: AutoTradeToggleRequest,
    current_user = Depends(get_current_user)
):
    """
    Включить/выключить автоторговлю для пользователя
    """
    try:
        user_id = current_user['id']
        
        if request.enabled:
            # Проверяем наличие API ключей
            # TODO: Получить API ключи из базы данных
            api_keys = {}
            
            # Проверяем наличие активных стратегий
            # TODO: Получить стратегии из базы данных
            strategies = []
            
            if not api_keys:
                raise HTTPException(
                    status_code=400,
                    detail="Необходимо настроить API ключи бирж перед включением автоторговли"
                )
                
            if not strategies:
                raise HTTPException(
                    status_code=400,
                    detail="Необходимо создать хотя бы одну активную стратегию"
                )
            
            # Включаем автоторговлю
            await auto_trade_engine.enable_user(user_id, api_keys, strategies)
            
            # TODO: Обновить статус в базе данных
            logger.info(f"Auto trade enabled for user {user_id}")
            
        else:
            # Выключаем автоторговлю
            await auto_trade_engine.disable_user(user_id)
            
            # TODO: Обновить статус в базе данных
            logger.info(f"Auto trade disabled for user {user_id}")
        
        return {
            "success": True,
            "enabled": request.enabled,
            "message": "Автоторговля " + ("включена" if request.enabled else "отключена")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling auto trade: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auto-trade/status", response_model=AutoTradeStatusResponse)
async def get_auto_trade_status(current_user = Depends(get_current_user)):
    """
    Получить статус автоторговли пользователя
    """
    try:
        user_id = current_user['id']
        
        # TODO: Получить данные из базы
        enabled = user_id in auto_trade_engine.active_users
        
        return {
            "enabled": enabled,
            "active_strategies": 0,  # TODO: Из базы
            "api_keys_configured": 0,  # TODO: Из базы
            "last_trade": None  # TODO: Из базы
        }
        
    except Exception as e:
        logger.error(f"Error getting auto trade status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auto-trade/stats")
async def get_auto_trade_stats(current_user = Depends(get_current_user)):
    """
    Получить статистику автоторговли
    """
    try:
        user_id = current_user['id']
        
        # TODO: Получить статистику из базы данных
        return {
            "total_trades": 0,
            "successful_trades": 0,
            "failed_trades": 0,
            "total_profit": 0.0,
            "avg_profit_percentage": 0.0,
            "today_trades": 0,
            "today_profit": 0.0
        }
        
    except Exception as e:
        logger.error(f"Error getting auto trade stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
