import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { 
  Filter, 
  TrendingUp, 
  DollarSign, 
  Percent,
  Building2,
  Save,
  RotateCcw,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FilterSettings {
  min_profit_percentage: number;
  max_profit_percentage: number;
  min_volume: number;
  selected_exchanges: string[];
  market_types: string[];
  enabled: boolean;
}

const AVAILABLE_EXCHANGES = [
  { id: 'htx', name: 'HTX', logo: '🔥' },
  { id: 'bybit', name: 'Bybit', logo: '🦅' },
  { id: 'kucoin', name: 'KuCoin', logo: '🟢' },
  { id: 'okx', name: 'OKX', logo: '⭕' },
  { id: 'bingx', name: 'BingX', logo: '🔷' }
];

const MARKET_TYPES = [
  { id: 'spot', name: 'Спот', icon: DollarSign },
  { id: 'futures', name: 'Фьючерсы', icon: TrendingUp }
];

export default function FiltersManager() {
  const { token } = useAuth();
  const [filters, setFilters] = useState<FilterSettings>({
    min_profit_percentage: 0.5,
    max_profit_percentage: 100,
    min_volume: 1000,
    selected_exchanges: AVAILABLE_EXCHANGES.map(e => e.id),
    market_types: ['spot', 'futures'],
    enabled: true
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleReset = () => {
    setFilters({
      min_profit_percentage: 0.5,
      max_profit_percentage: 100,
      min_volume: 1000,
      selected_exchanges: AVAILABLE_EXCHANGES.map(e => e.id),
      market_types: ['spot', 'futures'],
      enabled: true
    });
  };

  const toggleExchange = (exchangeId: string) => {
    setFilters(prev => ({
      ...prev,
      selected_exchanges: prev.selected_exchanges.includes(exchangeId)
        ? prev.selected_exchanges.filter(id => id !== exchangeId)
        : [...prev.selected_exchanges, exchangeId]
    }));
  };

  const toggleMarketType = (marketType: string) => {
    setFilters(prev => ({
      ...prev,
      market_types: prev.market_types.includes(marketType)
        ? prev.market_types.filter(t => t !== marketType)
        : [...prev.market_types, marketType]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Filter className="w-6 h-6" />
            Фильтры возможностей
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Настройте параметры для отбора арбитражных возможностей
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Сбросить
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={`btn-primary flex items-center gap-2 ${
              saveStatus === 'success' ? 'bg-green-600 hover:bg-green-700' :
              saveStatus === 'error' ? 'bg-red-600 hover:bg-red-700' : ''
            }`}
          >
            {saveStatus === 'saving' && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            {saveStatus === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {saveStatus === 'error' && <AlertCircle className="w-4 h-4" />}
            {saveStatus === 'idle' && <Save className="w-4 h-4" />}
            {saveStatus === 'saving' ? 'Сохранение...' :
             saveStatus === 'success' ? 'Сохранено!' :
             saveStatus === 'error' ? 'Ошибка' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-400 font-medium mb-1">
              Как работают фильтры?
            </p>
            <p className="text-xs text-blue-300/80">
              Фильтры помогают отобрать только те возможности, которые соответствуют вашим критериям. 
              Настройте минимальную прибыль, выберите биржи и типы рынков для получения персонализированных результатов.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profit Settings */}
        <div className="card space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-dark-border">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Percent className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Прибыль</h3>
              <p className="text-xs text-gray-400">Диапазон процента прибыли</p>
            </div>
          </div>

          {/* Min Profit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Минимальная прибыль
              </label>
              <span className="text-lg font-bold text-green-400">
                {filters.min_profit_percentage.toFixed(2)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={filters.min_profit_percentage}
              onChange={(e) => setFilters({ ...filters, min_profit_percentage: parseFloat(e.target.value) })}
              className="w-full h-2 bg-dark-secondary rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>5%</span>
              <span>10%</span>
            </div>
            <p className="text-xs text-gray-400 bg-dark-secondary p-3 rounded-lg">
              💡 Рекомендуется устанавливать минимум 0.5-1% для покрытия комиссий
            </p>
          </div>

          {/* Max Profit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Максимальная прибыль
              </label>
              <span className="text-lg font-bold text-blue-400">
                {filters.max_profit_percentage === 100 ? '∞' : `${filters.max_profit_percentage.toFixed(2)}%`}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={filters.max_profit_percentage}
              onChange={(e) => setFilters({ ...filters, max_profit_percentage: parseFloat(e.target.value) })}
              className="w-full h-2 bg-dark-secondary rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1%</span>
              <span>50%</span>
              <span>Без лимита</span>
            </div>
          </div>
        </div>

        {/* Volume Settings */}
        <div className="card space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-dark-border">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Объём</h3>
              <p className="text-xs text-gray-400">Минимальный объём торгов</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Минимальный объём (USDT)
              </label>
              <span className="text-lg font-bold text-purple-400">
                ${filters.min_volume.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="100000"
              step="100"
              value={filters.min_volume}
              onChange={(e) => setFilters({ ...filters, min_volume: parseFloat(e.target.value) })}
              className="w-full h-2 bg-dark-secondary rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>$100</span>
              <span>$50K</span>
              <span>$100K</span>
            </div>
            <p className="text-xs text-gray-400 bg-dark-secondary p-3 rounded-lg">
              ℹ️ Больший объём означает лучшую ликвидность и меньший риск проскальзывания
            </p>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400">Быстрый выбор:</p>
            <div className="grid grid-cols-3 gap-2">
              {[1000, 5000, 10000].map(value => (
                <button
                  key={value}
                  onClick={() => setFilters({ ...filters, min_volume: value })}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filters.min_volume === value
                      ? 'bg-purple-600 text-white'
                      : 'bg-dark-secondary text-gray-400 hover:bg-dark-border'
                  }`}
                >
                  ${value.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Exchanges Selection */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-dark-border">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Биржи</h3>
            <p className="text-xs text-gray-400">
              Выбрано: {filters.selected_exchanges.length} из {AVAILABLE_EXCHANGES.length}
            </p>
          </div>
          <button
            onClick={() => {
              if (filters.selected_exchanges.length === AVAILABLE_EXCHANGES.length) {
                setFilters({ ...filters, selected_exchanges: [] });
              } else {
                setFilters({ ...filters, selected_exchanges: AVAILABLE_EXCHANGES.map(e => e.id) });
              }
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {filters.selected_exchanges.length === AVAILABLE_EXCHANGES.length ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {AVAILABLE_EXCHANGES.map(exchange => {
            const isSelected = filters.selected_exchanges.includes(exchange.id);
            return (
              <button
                key={exchange.id}
                onClick={() => toggleExchange(exchange.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                    : 'border-dark-border bg-dark-secondary hover:border-gray-600'
                }`}
              >
                <div className="text-3xl mb-2">{exchange.logo}</div>
                <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {exchange.name}
                </p>
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400 mx-auto mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Market Types */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-dark-border">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Типы рынков</h3>
            <p className="text-xs text-gray-400">Выберите типы торговых рынков</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {MARKET_TYPES.map(market => {
            const isSelected = filters.market_types.includes(market.id);
            const Icon = market.icon;
            return (
              <button
                key={market.id}
                onClick={() => toggleMarketType(market.id)}
                className={`p-6 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/20'
                    : 'border-dark-border bg-dark-secondary hover:border-gray-600'
                }`}
              >
                <Icon className={`w-8 h-8 mx-auto mb-3 ${isSelected ? 'text-orange-400' : 'text-gray-500'}`} />
                <p className={`text-base font-semibold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                  {market.name}
                </p>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-orange-400 mx-auto mt-3" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="card bg-gradient-to-br from-dark-card to-dark-secondary border-2 border-blue-500/30">
        <h3 className="text-lg font-semibold text-white mb-4">📊 Сводка фильтров</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Прибыль:</span>
              <span className="text-white font-medium">
                {filters.min_profit_percentage.toFixed(2)}% - {filters.max_profit_percentage === 100 ? '∞' : `${filters.max_profit_percentage.toFixed(2)}%`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Мин. объём:</span>
              <span className="text-white font-medium">${filters.min_volume.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Биржи:</span>
              <span className="text-white font-medium">{filters.selected_exchanges.length} выбрано</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Рынки:</span>
              <span className="text-white font-medium">
                {filters.market_types.map(t => MARKET_TYPES.find(m => m.id === t)?.name).join(', ')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
