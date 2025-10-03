import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Bot, Plus, Play, Pause, Trash2, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import { ExchangeLogo } from '../common/ExchangeLogo';

interface Strategy {
  id: number;
  name: string;
  exchanges: string;
  min_profit_percentage: number;
  max_trade_amount: number;
  auto_trade_enabled: boolean;
  is_active: boolean;
  created_at: string;
  total_trades?: number;
  total_profit?: number;
}

export default function AutoTrading() {
  const { user, token } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    exchanges: [] as string[],
    min_profit_percentage: 0.5,
    max_trade_amount: 1000,
  });

  const availableExchanges = ['Binance', 'Bybit', 'HTX', 'KuCoin', 'OKX', 'BingX'];

  useEffect(() => {
    fetchStrategies();
    setAutoTradeEnabled(user?.auto_trade_enabled || false);
  }, [user]);

  const fetchStrategies = async () => {
    try {
      const response = await axios.get('/api/strategies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStrategies(response.data.strategies || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoTradeToggle = async () => {
    try {
      await axios.post('/api/user/auto-trade', 
        { enabled: !autoTradeEnabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAutoTradeEnabled(!autoTradeEnabled);
      alert(autoTradeEnabled ? 'Автоторговля отключена' : 'Автоторговля включена');
      // Reload page to update user state
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка изменения настроек автоторговли');
    }
  };

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate minimum 2 exchanges
    if (formData.exchanges.length < 2) {
      alert('Необходимо выбрать минимум 2 биржи для создания стратегии');
      return;
    }
    
    try {
      await axios.post('/api/strategies', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreateForm(false);
      setFormData({
        name: '',
        exchanges: [],
        min_profit_percentage: 0.5,
        max_trade_amount: 1000,
      });
      fetchStrategies();
      alert('Стратегия успешно создана!');
    } catch (error) {
      console.error('Error creating strategy:', error);
      alert('Ошибка при создании стратегии');
    }
  };

  const toggleAutoTrade = async (strategyId: number, enabled: boolean) => {
    try {
      await axios.patch(
        `/api/strategies/${strategyId}/auto-trade`,
        { enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchStrategies();
    } catch (error) {
      console.error('Error toggling auto-trade:', error);
      alert('Ошибка при изменении статуса автоторговли');
    }
  };

  const deleteStrategy = async (strategyId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту стратегию?')) return;
    
    try {
      await axios.delete(`/api/strategies/${strategyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStrategies();
      alert('Стратегия удалена');
    } catch (error) {
      console.error('Error deleting strategy:', error);
      alert('Ошибка при удалении стратегии');
    }
  };

  const toggleExchange = (exchange: string) => {
    setFormData(prev => ({
      ...prev,
      exchanges: prev.exchanges.includes(exchange)
        ? prev.exchanges.filter(e => e !== exchange)
        : [...prev.exchanges, exchange]
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-400">Загрузка стратегий...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6" />
            Автоматическая торговля
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Создавайте и управляйте стратегиями автоматической торговли
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary flex items-center gap-2"
        >
          {showCreateForm ? (
            <>Отмена</>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Создать стратегию
            </>
          )}
        </button>
      </div>

      {/* Auto Trade Toggle */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Включение автоторговли
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg">
            <div className="flex-1">
              <p className="text-white font-medium mb-1">Автоматическая торговля</p>
              <p className="text-sm text-gray-400">
                Система будет автоматически исполнять сделки по вашим стратегиям
              </p>
            </div>
            <button
              onClick={handleAutoTradeToggle}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                autoTradeEnabled ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  autoTradeEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {autoTradeEnabled && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-400 font-medium mb-1">
                  Автоторговля активна
                </p>
                <p className="text-xs text-gray-400">
                  Убедитесь, что у вас настроены API ключи бирж и активированы стратегии. 
                  Система будет автоматически исполнять сделки согласно вашим настройкам.
                </p>
              </div>
            </div>
          )}

          {!autoTradeEnabled && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-400 mb-1">Внимание!</h3>
                <p className="text-xs text-gray-300">
                  Автоматическая торговля отключена. Включите для автоматического исполнения сделок. 
                  Использует реальные средства - убедитесь, что понимаете риски.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateStrategy} className="card space-y-4 animate-slide-up">
          <h3 className="text-lg font-semibold text-white">Новая стратегия автоторговли</h3>

          <div>
            <label className="label">Название стратегии</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Моя стратегия"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Выберите биржи</label>
            <p className="text-xs text-gray-500 mb-2">Стратегия будет искать возможности на выбранных биржах</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableExchanges.map(exchange => (
                <button
                  key={exchange}
                  type="button"
                  onClick={() => toggleExchange(exchange)}
                  className={`px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                    formData.exchanges.includes(exchange)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-dark-secondary border-dark-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <ExchangeLogo exchange={exchange} size={20} />
                  {exchange}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Минимальная прибыль (%)</label>
              <p className="text-xs text-gray-500 mb-2">Минимальный процент прибыли для выполнения сделки</p>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                className="input-field"
                value={formData.min_profit_percentage}
                onChange={(e) => setFormData({ ...formData, min_profit_percentage: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Максимальная сумма сделки ($)</label>
              <p className="text-xs text-gray-500 mb-2">Максимальная сумма для одной сделки</p>
              <input
                type="number"
                min="0"
                required
                className="input-field"
                value={formData.max_trade_amount}
                onChange={(e) => setFormData({ ...formData, max_trade_amount: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <button type="submit" className="btn-success w-full">
            Создать стратегию
          </button>
        </form>
      )}

      {/* Strategies List */}
      {strategies.length === 0 ? (
        <div className="card text-center py-12">
          <Bot className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Нет активных стратегий</h3>
          <p className="text-gray-400">Создайте свою первую стратегию автоматической торговли</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {strategies.map((strategy) => {
            const exchanges = JSON.parse(strategy.exchanges);
            return (
              <div key={strategy.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                    <p className="text-sm text-gray-400">
                      Создана: {new Date(strategy.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  {strategy.auto_trade_enabled && (
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                        🤖 Активна
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Мин. прибыль</p>
                    <p className="text-lg font-bold text-green-400">
                      {strategy.min_profit_percentage}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Макс. сумма</p>
                    <p className="text-lg font-bold text-blue-400">
                      ${strategy.max_trade_amount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Всего сделок</p>
                    <p className="text-lg font-bold text-white">
                      {strategy.total_trades || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Общая прибыль</p>
                    <p className={`text-lg font-bold ${(strategy.total_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(strategy.total_profit || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2">Биржи</p>
                  <div className="flex flex-wrap gap-2">
                    {exchanges.map((ex: string) => (
                      <span key={ex} className="px-3 py-1 bg-dark-secondary text-sm rounded-full flex items-center gap-2">
                        <ExchangeLogo exchange={ex} size={16} />
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => deleteStrategy(strategy.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
