import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Filter, Plus, Save, ExternalLink, X, RefreshCw } from 'lucide-react';
import { ExchangeLogo } from '../common/ExchangeLogo';
import { CoinLogo } from '../common/CoinLogo';

interface FilterSettings {
  id: number;
  user_id: number;
  exchanges: string[];
  min_profit_percentage: number;
  trading_pairs: string[];
  created_at: string;
  updated_at: string;
}

export default function FiltersManager() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<FilterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    exchanges: [] as string[],
    min_profit_percentage: 0.5,
    trading_pairs: [] as string[],
  });

  const availableExchanges = ['HTX', 'Bybit', 'KuCoin', 'OKX', 'BingX'];
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);
  const [showPairDropdown, setShowPairDropdown] = useState(false);
  const [pairSearch, setPairSearch] = useState('');
  const [loadingPairs, setLoadingPairs] = useState(true);

  useEffect(() => {
    fetchFilters();
    fetchAvailablePairs();
  }, []);

  const fetchFilters = async () => {
    try {
      const response = await axios.get('/api/filters', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filterData = response.data.filters;
      if (filterData) {
        setFilters(filterData);
        setFormData({
          exchanges: filterData.exchanges || [],
          min_profit_percentage: filterData.min_profit_percentage || 0.5,
          trading_pairs: filterData.trading_pairs || [],
        });
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePairs = async () => {
    setLoadingPairs(true);
    try {
      const response = await axios.get('/api/available-pairs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pairs = response.data.pairs || [];
      console.log(`✅ Loaded ${pairs.length} available trading pairs`);
      console.log(`📊 Sample pairs:`, pairs.slice(0, 10));
      setAvailablePairs(pairs);
    } catch (error) {
      console.error('Error fetching available pairs:', error);
      setAvailablePairs([]);
    } finally {
      setLoadingPairs(false);
    }
  };

  const handleSaveFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/filters', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Фильтры успешно сохранены!');
      fetchFilters();
    } catch (error) {
      console.error('Error saving filters:', error);
      alert('Ошибка при сохранении фильтров');
    } finally {
      setSaving(false);
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

  const togglePair = (pair: string) => {
    setFormData(prev => ({
      ...prev,
      trading_pairs: prev.trading_pairs.includes(pair)
        ? prev.trading_pairs.filter(p => p !== pair)
        : [...prev.trading_pairs, pair]
    }));
  };


  const addPairFromDropdown = (pair: string) => {
    if (!formData.trading_pairs.includes(pair)) {
      setFormData(prev => ({
        ...prev,
        trading_pairs: [...prev.trading_pairs, pair]
      }));
    }
    setShowPairDropdown(false);
    setPairSearch('');
  };

  const getCoinSearchUrl = (pair: string) => {
    const [base] = pair.split('/');
    return `https://yandex.ru/search/?text=${base}+cryptocurrency`;
  };

  const filteredAvailablePairs = availablePairs.filter(pair => 
    pair.toLowerCase().includes(pairSearch.toLowerCase()) &&
    !formData.trading_pairs.includes(pair)
  );

  const removePair = (pair: string) => {
    setFormData(prev => ({
      ...prev,
      trading_pairs: prev.trading_pairs.filter(p => p !== pair)
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
            <Filter className="w-6 h-6" />
            Фильтры арбитража
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Настройте параметры для отслеживания арбитражных возможностей
          </p>
        </div>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleSaveFilters} className="card space-y-6 animate-slide-up">

        <div>
          <label className="label">Биржи для мониторинга</label>
          <p className="text-xs text-gray-500 mb-2">Выберите минимум 2 биржи для поиска арбитражных возможностей</p>
          {formData.exchanges.length > 0 && formData.exchanges.length < 2 && (
            <p className="text-xs text-red-400 mb-2">⚠️ Необходимо выбрать минимум 2 биржи</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Торговые пары</label>
            <button
              type="button"
              onClick={fetchAvailablePairs}
              disabled={loadingPairs}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loadingPairs ? 'animate-spin' : ''}`} />
              Обновить
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Выберите криптовалютные пары для отслеживания (оставьте пустым для всех пар)
            {availablePairs.length > 0 && (
              <span className="ml-2 text-blue-400 font-semibold">
                • Доступно: {availablePairs.length} пар
              </span>
            )}
          </p>
          
          {/* Pair selection dropdown */}
          <div className="mb-3 relative">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Поиск..."
                value={pairSearch}
                onChange={(e) => setPairSearch(e.target.value)}
                onFocus={() => setShowPairDropdown(true)}
                className="input-field flex-1"
              />
              <button
                type="button"
                onClick={() => setShowPairDropdown(!showPairDropdown)}
                className="btn-secondary px-4"
              >
                {showPairDropdown ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
            
            {showPairDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-dark-secondary border border-dark-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
                <div className="sticky top-0 bg-dark-secondary border-b border-dark-border px-3 py-2 text-xs text-gray-400 z-10">
                  {loadingPairs ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-blue-500"></div>
                      Загрузка пар...
                    </span>
                  ) : (
                    <span>
                      Найдено: <span className="text-white font-semibold">{filteredAvailablePairs.length}</span> из {availablePairs.length} пар
                      {pairSearch && <span className="text-blue-400"> (поиск: "{pairSearch}")</span>}
                    </span>
                  )}
                </div>
                {loadingPairs ? (
                  <div className="px-3 py-8 text-center text-gray-500 text-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    Загрузка торговых пар...
                  </div>
                ) : filteredAvailablePairs.length === 0 ? (
                  <div className="px-3 py-8 text-center text-gray-500 text-sm">
                    {pairSearch ? `Ничего не найдено по запросу "${pairSearch}"` : 'Нет доступных пар'}
                  </div>
                ) : (
                  filteredAvailablePairs.map(pair => (
                    <div
                      key={pair}
                      className="flex items-center justify-between px-3 py-2 hover:bg-dark-border cursor-pointer transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => addPairFromDropdown(pair)}
                        className="flex-1 text-left text-sm text-white flex items-center gap-2 hover:text-blue-400 transition-colors"
                      >
                        <CoinLogo symbol={pair} size={20} />
                        {pair}
                      </button>
                      <a
                        href={getCoinSearchUrl(pair)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {showPairDropdown && !loadingPairs && availablePairs.length === 0 && (
              <div className="absolute z-10 w-full mt-1 bg-dark-secondary border border-dark-border rounded-lg shadow-lg p-4 text-center">
                <p className="text-sm text-yellow-400 mb-2"> �������� ���� ��� �� ���������</p>
                <p className="text-xs text-gray-500">��������� 1-2 ������ ����� ������� ����</p>
              </div>
            )}
          </div>

          {/* Selected pairs */}
          {formData.trading_pairs.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Выбранные пары:</p>
              <div className="flex flex-wrap gap-2">
                {formData.trading_pairs.map(pair => (
                  <span
                    key={pair}
                    className="px-3 py-1 bg-green-900/30 text-green-400 text-sm rounded-full flex items-center gap-2"
                  >
                    <CoinLogo symbol={pair} size={16} />
                    {pair}
                    <button
                      type="button"
                      onClick={() => removePair(pair)}
                      className="hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Минимальная прибыль (%)</label>
            <p className="text-xs text-gray-500 mb-2">Минимальный процент прибыли для отображения возможности</p>
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
        </div>

        <div className="flex gap-3">
          <button 
            type="submit" 
            disabled={saving || (formData.exchanges.length > 0 && formData.exchanges.length < 2)}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Сохранение...' : 'Сохранить фильтры'}
          </button>
        </div>
        {formData.exchanges.length > 0 && formData.exchanges.length < 2 && (
          <p className="text-sm text-red-400 text-center">Выберите минимум 2 биржи для сохранения</p>
        )}
      </form>

      {/* Current Filters Summary */}
      {filters && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Текущие настройки</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">Выбранные биржи</p>
              <div className="flex flex-wrap gap-2">
                {filters.exchanges && filters.exchanges.length > 0 ? (
                  filters.exchanges.map(ex => (
                    <span key={ex} className="px-3 py-1 bg-blue-900/30 text-blue-400 text-sm rounded-full flex items-center gap-2">
                      <ExchangeLogo exchange={ex} size={16} />
                      {ex}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">Все биржи</span>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-2">Торговые пары</p>
              <div className="flex flex-wrap gap-2">
                {filters.trading_pairs.length > 0 ? (
                  filters.trading_pairs.map(pair => (
                    <span key={pair} className="px-3 py-1 bg-green-900/30 text-green-400 text-sm rounded-full">
                      {pair}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 text-sm">Все пары</span>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-xs text-gray-400 mb-1">Мин. прибыль</p>
              <p className="text-lg font-bold text-green-400">
                {filters.min_profit_percentage}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
