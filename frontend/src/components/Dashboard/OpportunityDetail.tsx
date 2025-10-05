import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Clock,
  Zap,
  ArrowRightLeft,
  AlertTriangle,
  BarChart3,
  Activity,
  Loader2,
  RefreshCw,
  Brain,
  Target,
  Wallet,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { ExchangeLogo } from '../common/ExchangeLogo';
import { CoinLogo } from '../common/CoinLogo';
import { getNetworkInfo } from '../../utils/networkInfo';

interface OpportunityDetailData {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercentage: number;
  marketType: 'spot' | 'futures';
  timestamp: number;
  
  // Market data from CCXT
  marketData?: {
    volume24h: number;
    high24h: number;
    low24h: number;
    priceChange24h: number;
    lastUpdate: number;
    orderbook?: {
      bids: [number, number][];
      asks: [number, number][];
    };
  };
  
  // AI Analysis
  aiAnalysis?: {
    recommendation: 'buy' | 'hold' | 'avoid';
    confidence: number;
    suggestedAmount: number;
    risks: string[];
    opportunities: string[];
    marketSentiment: string;
    optimalEntryPrice: number;
    optimalExitPrice: number;
  };
}

export default function OpportunityDetail() {
  const { symbol, buyExchange, sellExchange } = useParams<{
    symbol: string;
    buyExchange: string;
    sellExchange: string;
  }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [data, setData] = useState<OpportunityDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDetailedData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchDetailedData(true);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [symbol, buyExchange, sellExchange]);

  const fetchDetailedData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await axios.get(
        `/api/opportunity-detail/${symbol}/${buyExchange}/${sellExchange}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching opportunity detail:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTrade = (exchange: string, action: 'buy' | 'sell') => {
    if (!data) return;
    
    const normalizedSymbol = data.symbol.replace('/', '').toUpperCase();
    const [base, quote] = data.symbol.split('/');
    
    let url = '#';
    
    switch (exchange.toLowerCase()) {
      case 'htx':
        url = `https://www.htx.com/trade/${base.toLowerCase()}_${quote.toLowerCase()}`;
        break;
      case 'bybit':
        url = `https://www.bybit.com/trade/spot/${base}/${quote}`;
        break;
      case 'kucoin':
        url = `https://www.kucoin.com/trade/${base}-${quote}`;
        break;
      case 'okx':
        url = `https://www.okx.com/trade-spot/${base.toLowerCase()}-${quote.toLowerCase()}`;
        break;
      case 'bingx':
        url = `https://bingx.com/en-us/spot/${base}${quote}`;
        break;
    }
    
    if (url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Загрузка детальной информации...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Ошибка загрузки</h2>
          <p className="text-gray-400 mb-6">{error || 'Возможность не найдена'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  const networkInfo = getNetworkInfo(data.symbol);
  const secondsAgo = Math.floor((Date.now() - data.timestamp) / 1000);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-card border-b border-dark-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Назад к возможностям</span>
            </button>
            
            <button
              onClick={() => fetchDetailedData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-dark-secondary hover:bg-dark-secondary/80 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Warning if data is stale */}
        {secondsAgo > 10 && (
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold text-sm mb-1">
                Внимание: Данные могут быть неактуальны
              </p>
              <p className="text-yellow-300/80 text-xs">
                Эта возможность была обнаружена {secondsAgo} секунд назад. 
                Цены могли измениться. Проверьте актуальность на бирже перед совершением сделки.
              </p>
            </div>
          </div>
        )}

        {/* Main Info Card */}
        <div className="card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl">
                <CoinLogo symbol={data.symbol} size={48} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{data.symbol}</h1>
                <span className="text-sm text-gray-400 uppercase">{data.marketType}</span>
              </div>
            </div>
            
            <div className="text-left lg:text-right">
              <p className="text-sm text-gray-400 mb-1">Потенциальная прибыль</p>
              <p className="text-4xl font-bold text-green-400">
                +{data.profitPercentage.toFixed(3)}%
              </p>
            </div>
          </div>

          {/* Trading Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Buy Section */}
            <div className="bg-gradient-to-br from-green-900/30 via-green-800/20 to-transparent border border-green-500/30 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <ExchangeLogo exchange={data.buyExchange} size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase">Купить на</p>
                  <p className="text-xl font-bold text-white">{data.buyExchange}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">Цена покупки</p>
                <p className="text-2xl font-bold text-green-400">${data.buyPrice.toFixed(6)}</p>
              </div>
              <button
                onClick={() => handleTrade(data.buyExchange, 'buy')}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold shadow-lg shadow-green-500/30"
              >
                <ShoppingCart className="w-5 h-5" />
                Купить на {data.buyExchange}
              </button>
            </div>

            {/* Sell Section */}
            <div className="bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-transparent border border-blue-500/30 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <ExchangeLogo exchange={data.sellExchange} size={24} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 uppercase">Продать на</p>
                  <p className="text-xl font-bold text-white">{data.sellExchange}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-1">Цена продажи</p>
                <p className="text-2xl font-bold text-blue-400">${data.sellPrice.toFixed(6)}</p>
              </div>
              <button
                onClick={() => handleTrade(data.sellExchange, 'sell')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold shadow-lg shadow-blue-500/30"
              >
                <DollarSign className="w-5 h-5" />
                Продать на {data.sellExchange}
              </button>
            </div>
          </div>

          {/* Network Info */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-700">
            <div className="text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-gray-400" />
              <p className="text-xs text-gray-500 mb-1">Обнаружено</p>
              <p className="text-sm font-mono text-white">
                {new Date(data.timestamp).toLocaleTimeString('ru-RU')}
              </p>
            </div>
            <div className="text-center">
              <Zap className="w-5 h-5 mx-auto mb-2 text-yellow-400" />
              <p className="text-xs text-gray-500 mb-1">Комиссия сети</p>
              <p className="text-sm font-mono text-yellow-400">{networkInfo.fee}</p>
            </div>
            <div className="text-center">
              <ArrowRightLeft className="w-5 h-5 mx-auto mb-2 text-blue-400" />
              <p className="text-xs text-gray-500 mb-1">Время перевода</p>
              <p className="text-sm font-mono text-blue-400">{networkInfo.transferTime}</p>
            </div>
          </div>
        </div>

        {/* Market Data */}
        {data.marketData && (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Рыночные данные
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-dark-secondary rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Объем 24ч</p>
                <p className="text-lg font-bold text-white">
                  ${data.marketData.volume24h.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-dark-secondary rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Максимум 24ч</p>
                <p className="text-lg font-bold text-green-400">
                  ${data.marketData.high24h.toFixed(6)}
                </p>
              </div>
              
              <div className="bg-dark-secondary rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Минимум 24ч</p>
                <p className="text-lg font-bold text-red-400">
                  ${data.marketData.low24h.toFixed(6)}
                </p>
              </div>
              
              <div className="bg-dark-secondary rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Изменение 24ч</p>
                <p className={`text-lg font-bold ${data.marketData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.marketData.priceChange24h >= 0 ? '+' : ''}
                  {data.marketData.priceChange24h.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Order Book Preview */}
            {data.marketData.orderbook && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-3">Стакан заявок</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Bids */}
                  <div>
                    <p className="text-xs text-green-400 font-semibold mb-2">Покупка (Bids)</p>
                    <div className="space-y-1">
                      {data.marketData.orderbook.bids.slice(0, 5).map((bid, idx) => (
                        <div key={idx} className="flex justify-between text-sm bg-green-900/10 rounded px-2 py-1">
                          <span className="text-green-400">${bid[0].toFixed(6)}</span>
                          <span className="text-gray-400">{bid[1].toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Asks */}
                  <div>
                    <p className="text-xs text-red-400 font-semibold mb-2">Продажа (Asks)</p>
                    <div className="space-y-1">
                      {data.marketData.orderbook.asks.slice(0, 5).map((ask, idx) => (
                        <div key={idx} className="flex justify-between text-sm bg-red-900/10 rounded px-2 py-1">
                          <span className="text-red-400">${ask[0].toFixed(6)}</span>
                          <span className="text-gray-400">{ask[1].toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Analysis */}
        {data.aiAnalysis && (
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" />
              AI Анализ и Рекомендации
            </h2>

            {/* Recommendation Badge */}
            <div className="mb-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${
                data.aiAnalysis.recommendation === 'buy' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                data.aiAnalysis.recommendation === 'hold' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                'bg-red-500/20 text-red-400 border border-red-500/50'
              }`}>
                {data.aiAnalysis.recommendation === 'buy' && <CheckCircle2 className="w-5 h-5" />}
                {data.aiAnalysis.recommendation === 'hold' && <Info className="w-5 h-5" />}
                {data.aiAnalysis.recommendation === 'avoid' && <XCircle className="w-5 h-5" />}
                <span className="uppercase">
                  {data.aiAnalysis.recommendation === 'buy' ? 'Рекомендуется' :
                   data.aiAnalysis.recommendation === 'hold' ? 'Подождать' : 'Избегать'}
                </span>
                <span className="text-xs opacity-75">
                  (Уверенность: {data.aiAnalysis.confidence}%)
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="bg-dark-secondary rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    <p className="text-sm font-semibold text-white">Рекомендуемая сумма</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">
                    ${data.aiAnalysis.suggestedAmount.toLocaleString()}
                  </p>
                </div>

                <div className="bg-dark-secondary rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-400" />
                    <p className="text-sm font-semibold text-white">Оптимальная цена входа</p>
                  </div>
                  <p className="text-xl font-bold text-green-400">
                    ${data.aiAnalysis.optimalEntryPrice.toFixed(6)}
                  </p>
                </div>

                <div className="bg-dark-secondary rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-red-400" />
                    <p className="text-sm font-semibold text-white">Оптимальная цена выхода</p>
                  </div>
                  <p className="text-xl font-bold text-red-400">
                    ${data.aiAnalysis.optimalExitPrice.toFixed(6)}
                  </p>
                </div>

                <div className="bg-dark-secondary rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <p className="text-sm font-semibold text-white">Настроение рынка</p>
                  </div>
                  <p className="text-base text-gray-300">{data.aiAnalysis.marketSentiment}</p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Opportunities */}
                <div>
                  <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Возможности
                  </h3>
                  <ul className="space-y-2">
                    {data.aiAnalysis.opportunities.map((opp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{opp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risks */}
                <div>
                  <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Риски
                  </h3>
                  <ul className="space-y-2">
                    {data.aiAnalysis.risks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
