import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Target, Plus, Play, Pause, Trash2, Edit } from 'lucide-react';

interface Strategy {
  id: number;
  name: string;
  exchanges: string;
  min_profit_percentage: number;
  max_trade_amount: number;
  auto_trade_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

export default function StrategiesManager() {
  const { token } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    exchanges: [] as string[],
    min_profit_percentage: 0.5,
    max_trade_amount: 1000,
  });

  const availableExchanges = ['Binance', 'Bybit', 'HTX', 'KuCoin', 'OKX', 'BingX'];

  useEffect(() => {
    fetchStrategies();
  }, []);

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

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (error) {
      console.error('Error creating strategy:', error);
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
            <Target className="w-6 h-6" />
            Стратегии
          </h2>
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

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateStrategy} className="card space-y-4 animate-slide-up">
          <h3 className="text-lg font-semibold text-white">Новая стратегия</h3>

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
            <div className="grid grid-cols-3 gap-2">
              {availableExchanges.map(exchange => (
                <button
                  key={exchange}
                  type="button"
                  onClick={() => toggleExchange(exchange)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    formData.exchanges.includes(exchange)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-dark-secondary border-dark-border text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {exchange}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Минимальная прибыль (%)</label>
              <input
                type="number"
                step="0.1"
                required
                className="input-field"
                value={formData.min_profit_percentage}
                onChange={(e) => setFormData({ ...formData, min_profit_percentage: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Максимальная сумма сделки ($)</label>
              <input
                type="number"
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
          <Target className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Нет активных стратегий</h3>
          <p className="text-gray-400">Создайте свою первую торговую стратегию</p>
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
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      strategy.auto_trade_enabled
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {strategy.auto_trade_enabled ? '🤖 Автоторговля' : '⏸️ Остановлена'}
                    </span>
                  </div>
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
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">Биржи</p>
                    <div className="flex flex-wrap gap-1">
                      {exchanges.map((ex: string) => (
                        <span key={ex} className="px-2 py-1 bg-dark-secondary text-xs rounded">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => toggleAutoTrade(strategy.id, !strategy.auto_trade_enabled)}
                    className={strategy.auto_trade_enabled ? 'btn-danger flex-1' : 'btn-success flex-1'}
                  >
                    {strategy.auto_trade_enabled ? '⏸️ Остановить' : '▶️ Запустить'}
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
