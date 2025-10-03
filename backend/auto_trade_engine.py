"""
Движок автоматической торговли для PairoBot
Автоматически исполняет сделки на основе арбитражных возможностей и стратегий пользователя
"""

import asyncio
import logging
from typing import List, Dict, Optional
from datetime import datetime
import ccxt.async_support as ccxt

logger = logging.getLogger(__name__)


class AutoTradeEngine:
    """Движок автоматической торговли"""
    
    def __init__(self):
        self.active_users = {}  # user_id -> user_config
        self.running = False
        self.task = None
        
    async def start(self):
        """Запуск движка автоторговли"""
        if self.running:
            logger.warning("Auto trade engine already running")
            return
            
        self.running = True
        self.task = asyncio.create_task(self._trading_loop())
        logger.info("Auto trade engine started")
        
    async def stop(self):
        """Остановка движка автоторговли"""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Auto trade engine stopped")
        
    async def enable_user(self, user_id: int, api_keys: Dict[str, Dict], strategies: List[Dict]):
        """Включить автоторговлю для пользователя"""
        self.active_users[user_id] = {
            'api_keys': api_keys,
            'strategies': strategies,
            'last_check': None,
            'active_trades': []
        }
        logger.info(f"Auto trade enabled for user {user_id}")
        
    async def disable_user(self, user_id: int):
        """Отключить автоторговлю для пользователя"""
        if user_id in self.active_users:
            del self.active_users[user_id]
            logger.info(f"Auto trade disabled for user {user_id}")
            
    async def _trading_loop(self):
        """Основной цикл торговли"""
        while self.running:
            try:
                for user_id, config in list(self.active_users.items()):
                    await self._process_user_trades(user_id, config)
                    
                # Проверка каждые 5 секунд
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in trading loop: {e}")
                await asyncio.sleep(5)
                
    async def _process_user_trades(self, user_id: int, config: Dict):
        """Обработка сделок для конкретного пользователя"""
        try:
            # Получаем арбитражные возможности
            opportunities = await self._get_opportunities(config)
            
            # Фильтруем по стратегиям пользователя
            filtered_opps = self._filter_by_strategies(opportunities, config['strategies'])
            
            # Исполняем сделки
            for opp in filtered_opps:
                await self._execute_trade(user_id, opp, config)
                
        except Exception as e:
            logger.error(f"Error processing trades for user {user_id}: {e}")
            
    async def _get_opportunities(self, config: Dict) -> List[Dict]:
        """Получить текущие арбитражные возможности"""
        # TODO: Интеграция с движком поиска арбитража
        return []
        
    def _filter_by_strategies(self, opportunities: List[Dict], strategies: List[Dict]) -> List[Dict]:
        """Фильтровать возможности по стратегиям пользователя"""
        filtered = []
        
        for opp in opportunities:
            for strategy in strategies:
                if not strategy.get('is_active'):
                    continue
                    
                # Проверка минимальной прибыли
                if opp['profit_percentage'] < strategy['min_profit_percentage']:
                    continue
                    
                # Проверка бирж
                strategy_exchanges = set(strategy['exchanges'].split(','))
                if opp['buy_exchange'] not in strategy_exchanges or opp['sell_exchange'] not in strategy_exchanges:
                    continue
                    
                # Проверка максимального объема
                if opp.get('volume', 0) > strategy['max_trade_amount']:
                    continue
                    
                filtered.append(opp)
                break
                
        return filtered
        
    async def _execute_trade(self, user_id: int, opportunity: Dict, config: Dict):
        """Исполнить сделку"""
        try:
            logger.info(f"Executing trade for user {user_id}: {opportunity['symbol']}")
            
            # Получаем API ключи для бирж
            buy_exchange_name = opportunity['buy_exchange']
            sell_exchange_name = opportunity['sell_exchange']
            
            buy_api_keys = config['api_keys'].get(buy_exchange_name)
            sell_api_keys = config['api_keys'].get(sell_exchange_name)
            
            if not buy_api_keys or not sell_api_keys:
                logger.warning(f"Missing API keys for {buy_exchange_name} or {sell_exchange_name}")
                return
                
            # Создаем подключения к биржам
            buy_exchange = self._create_exchange(buy_exchange_name, buy_api_keys)
            sell_exchange = self._create_exchange(sell_exchange_name, sell_api_keys)
            
            # Рассчитываем объем сделки
            trade_amount = self._calculate_trade_amount(opportunity, config)
            
            # Исполняем покупку
            buy_order = await buy_exchange.create_market_buy_order(
                opportunity['symbol'],
                trade_amount
            )
            
            logger.info(f"Buy order executed: {buy_order['id']}")
            
            # Исполняем продажу
            sell_order = await sell_exchange.create_market_sell_order(
                opportunity['symbol'],
                trade_amount
            )
            
            logger.info(f"Sell order executed: {sell_order['id']}")
            
            # Сохраняем сделку в базу данных
            await self._save_trade(user_id, opportunity, buy_order, sell_order)
            
            # Закрываем подключения
            await buy_exchange.close()
            await sell_exchange.close()
            
        except Exception as e:
            logger.error(f"Error executing trade: {e}")
            
    def _create_exchange(self, exchange_name: str, api_keys: Dict):
        """Создать подключение к бирже"""
        exchange_class = getattr(ccxt, exchange_name.lower())
        return exchange_class({
            'apiKey': api_keys['api_key'],
            'secret': api_keys['api_secret'],
            'password': api_keys.get('passphrase'),
            'enableRateLimit': True,
        })
        
    def _calculate_trade_amount(self, opportunity: Dict, config: Dict) -> float:
        """Рассчитать объем сделки"""
        # TODO: Более сложная логика расчета объема
        # Учитывать баланс, риск-менеджмент, лимиты стратегии
        return 0.001  # Минимальный объем для теста
        
    async def _save_trade(self, user_id: int, opportunity: Dict, buy_order: Dict, sell_order: Dict):
        """Сохранить сделку в базу данных"""
        # TODO: Сохранение в базу данных
        trade_data = {
            'user_id': user_id,
            'symbol': opportunity['symbol'],
            'buy_exchange': opportunity['buy_exchange'],
            'sell_exchange': opportunity['sell_exchange'],
            'buy_price': buy_order['price'],
            'sell_price': sell_order['price'],
            'amount': buy_order['amount'],
            'profit': (sell_order['price'] - buy_order['price']) * buy_order['amount'],
            'profit_percentage': opportunity['profit_percentage'],
            'status': 'completed',
            'created_at': datetime.now(),
            'completed_at': datetime.now()
        }
        logger.info(f"Trade saved: {trade_data}")


# Глобальный экземпляр движка
auto_trade_engine = AutoTradeEngine()
