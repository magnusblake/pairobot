import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Clock,
  Search,
  Zap,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import { ExchangeLogo } from '../common/ExchangeLogo';
import { CoinLogo } from '../common/CoinLogo';
import BotStats from './BotStats';
import LiveStats from './LiveStats';
import { getNetworkInfo } from '../../utils/networkInfo';

interface Opportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercentage: number;
  marketType: 'spot' | 'futures';
  timestamp: number;
  id?: string; // Уникальный идентификатор
}

type ViewFormat = 'list' | 'grid-2' | 'grid-4';

const VIEW_FORMATS: ViewFormat[] = ['list', 'grid-2', 'grid-4'];


// Generate unique ID for opportunity
const generateOpportunityId = (opp: Opportunity): string => {
  return `${opp.symbol}-${opp.buyExchange}-${opp.sellExchange}-${opp.timestamp}`;
};

// Мемоизированный компонент карточки возможности
interface OpportunityCardProps {
  opp: Opportunity;
  viewFormat: ViewFormat;
  onTrade: (opp: Opportunity, action: 'buy' | 'sell') => void;
  getExchangeUrl: (exchange: string, symbol: string, action: 'buy' | 'sell') => string;
  isPinned?: boolean;
  onClick?: (opp: Opportunity) => void;
}

const OpportunityCard = memo<OpportunityCardProps>(({ opp, viewFormat, onTrade, getExchangeUrl, isPinned, onClick }) => {
  
  // Format time as HH:MM:SS
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };
  
  // Get network info for this opportunity
  const networkInfo = getNetworkInfo(opp.symbol);
  
  return (
    <div
      onClick={() => onClick && onClick(opp)}
      className={`card transition-all relative cursor-pointer ${
        viewFormat === 'grid-4' ? 'text-sm' : ''
      } ${isPinned ? '' : 'hover:bg-dark-secondary/50'}`}
    >
      
      <div className={`flex flex-col ${
        viewFormat === 'grid-4' ? 'gap-3' : 'gap-4'
      }`}>
        {/* Header with symbol and profit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <CoinLogo symbol={opp.symbol} size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">{opp.symbol}</h3>
              <span className="text-[10px] text-gray-500 uppercase">
                {opp.marketType}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="px-3 py-1.5 bg-dark-secondary rounded-lg border border-dark-border">
              <p className="font-bold text-white text-base">
                +{opp.profitPercentage.toFixed(3)}%
              </p>
            </div>
          </div>
        </div>

        {/* Exchange info - Modern gradient design */}
        <div className="space-y-2">
          {/* Buy section */}
          <div className="bg-gradient-to-r from-green-900/20 via-green-800/10 to-transparent border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-500/20 rounded">
                  <ExchangeLogo exchange={opp.buyExchange} size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Купить</p>
                  <p className="font-semibold text-white text-xs">{opp.buyExchange}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Цена</p>
                <p className="font-bold text-green-400 text-sm">${opp.buyPrice.toFixed(4)}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTrade(opp, 'buy');
              }}
              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold shadow-lg shadow-green-500/20"
            >
              <ShoppingCart className="w-3 h-3" />
              Купить
            </button>
          </div>

          {/* Sell section */}
          <div className="bg-gradient-to-r from-blue-900/20 via-blue-800/10 to-transparent border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/20 rounded">
                  <ExchangeLogo exchange={opp.sellExchange} size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase">Продать</p>
                  <p className="font-semibold text-white text-xs">{opp.sellExchange}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Цена</p>
                <p className="font-bold text-blue-400 text-sm">${opp.sellPrice.toFixed(4)}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTrade(opp, 'sell');
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold shadow-lg shadow-blue-500/20"
            >
              <DollarSign className="w-3 h-3" />
              Продать
            </button>
          </div>
        </div>

        {/* Footer with time, network fee, and transfer time */}
        <div className="pt-2 border-t border-gray-800/50">
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            {/* Time */}
            <div className="flex flex-col items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{formatTime(opp.timestamp)}</span>
            </div>
            
            {/* Network Fee */}
            <div className="flex flex-col items-center gap-1 text-yellow-400">
              <Zap className="w-3 h-3" />
              <span className="font-mono" title="Комиссия сети">{networkInfo.fee}</span>
            </div>
            
            {/* Transfer Time */}
            <div className="flex flex-col items-center gap-1 text-blue-400">
              <ArrowRightLeft className="w-3 h-3" />
              <span className="font-mono" title="Время перевода">{networkInfo.transferTime}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Обновляем карточку только если изменились ключевые данные
  return prevProps.opp.id === nextProps.opp.id &&
         prevProps.opp.profitPercentage === nextProps.opp.profitPercentage &&
         prevProps.viewFormat === nextProps.viewFormat;
});

export default function OpportunitiesList() {
  const { token } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [marketType, setMarketType] = useState<'spot' | 'futures'>('spot');
  const [viewFormat] = useState<ViewFormat>('grid-4'); // Fixed to 4x4 grid
  const [searchTerm, setSearchTerm] = useState('');
  const [pinnedOpportunity, setPinnedOpportunity] = useState<Opportunity | null>(null);

  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [nextUpdate, setNextUpdate] = useState(3);

  // Используем ref для хранения актуального marketType без перезапуска useEffect
  const marketTypeRef = useRef(marketType);
  
  // Обновляем ref при изменении marketType
  useEffect(() => {
    marketTypeRef.current = marketType;
    // При смене типа рынка сразу загружаем новые данные, но не показываем экран загрузки
    fetchOpportunities(false);
  }, [marketType]);

  useEffect(() => {
    fetchOpportunities(true);
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(() => {
      fetchOpportunities(false); // Не показываем загрузку при автообновлении
      setNextUpdate(3);
    }, 3000);

    // Countdown timer
    const countdown = setInterval(() => {
      setNextUpdate(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, []); // Убрали marketType из зависимостей

  const fetchOpportunities = async (showLoading = true) => {
    if (showLoading && isInitialLoad) {
      setLoading(true);
    }
    
    try {
      const response = await axios.get(`/api/opportunities?market=${marketTypeRef.current}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allOpps = (response.data.opportunities || []).map((opp: Opportunity) => ({
        ...opp,
        id: generateOpportunityId(opp)
      }));
      
      // Simply set opportunities without tracking expired
      setOpportunities(allOpps);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      if (showLoading && isInitialLoad) {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  const getExchangeUrl = (exchange: string, symbol: string, action: 'buy' | 'sell'): string => {
    // Normalize symbol (remove /)
    const normalizedSymbol = symbol.replace('/', '').toUpperCase();
    const [base, quote] = symbol.split('/');
    
    switch (exchange.toLowerCase()) {
      case 'htx':
        return `https://www.htx.com/trade/${base.toLowerCase()}_${quote.toLowerCase()}`;
      case 'bybit':
        return `https://www.bybit.com/trade/spot/${base}/${quote}`;
      case 'kucoin':
        return `https://www.kucoin.com/trade/${base}-${quote}`;
      case 'okx':
        return `https://www.okx.com/trade-spot/${base.toLowerCase()}-${quote.toLowerCase()}`;
      case 'bingx':
        return `https://bingx.com/en-us/spot/${base}${quote}`;
      default:
        return '#';
    }
  };

  const handleTrade = useCallback((opp: Opportunity, action: 'buy' | 'sell') => {
    const exchange = action === 'buy' ? opp.buyExchange : opp.sellExchange;
    const url = getExchangeUrl(exchange, opp.symbol, action);
    
    if (url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert(`Биржа ${exchange} не поддерживается для прямого перехода`);
    }
  }, []);
  
  const handlePin = useCallback((opp: Opportunity) => {
    if (pinnedOpportunity?.id === opp.id) {
      setPinnedOpportunity(null);
    } else {
      setPinnedOpportunity(opp);
    }
  }, [pinnedOpportunity]);

  // Filter opportunities - мемоизируем для предотвращения лишних ререндеров
  const filteredOpps = useMemo(() => {
    // Filter by market type first
    let allOpps = opportunities.filter(opp => opp.marketType === marketType);
    
    // Filter by search term
    if (searchTerm) {
      allOpps = allOpps.filter(opp => 
        opp.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.buyExchange.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.sellExchange.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return allOpps;
  }, [opportunities, marketType, searchTerm]);
  
  // Calculate statistics
  const getStatistics = () => {
    const allOpps = opportunities.filter(o => o.marketType === marketType);
    
    if (allOpps.length === 0) {
      return {
        avgProfit: 0,
        maxProfit: 0,
        totalOpportunities: 0,
        topExchanges: [],
        uniqueSymbols: 0
      };
    }
    
    const avgProfit = allOpps.reduce((sum, o) => sum + o.profitPercentage, 0) / allOpps.length;
    const maxProfit = Math.max(...allOpps.map(o => o.profitPercentage));
    
    // Count unique symbols
    const uniqueSymbols = new Set(allOpps.map(o => o.symbol)).size;
    
    // Count exchanges
    const exchangeCounts = new Map<string, number>();
    allOpps.forEach(opp => {
      exchangeCounts.set(opp.buyExchange, (exchangeCounts.get(opp.buyExchange) || 0) + 1);
      exchangeCounts.set(opp.sellExchange, (exchangeCounts.get(opp.sellExchange) || 0) + 1);
    });
    
    const topExchanges = Array.from(exchangeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    
    return {
      avgProfit,
      maxProfit,
      totalOpportunities: allOpps.length,
      topExchanges,
      uniqueSymbols
    };
  };
  
  const stats = getStatistics();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-400">Загрузка возможностей...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Bot Statistics - Removed as per user request */}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Арбитражные возможности
            </h2>
            <p className="text-sm md:text-base text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                Найдено: <span className="font-semibold text-blue-400">{filteredOpps.length}</span>
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Обновление через {nextUpdate}с
              </span>
            </p>
          </div>

          {/* Market Type Toggle */}
          <div className="flex space-x-2 bg-dark-secondary rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setMarketType('spot')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-colors ${
                marketType === 'spot'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Споты
            </button>
            <button
              onClick={() => setMarketType('futures')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-colors ${
                marketType === 'futures'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Фьючерсы
            </button>
          </div>
        </div>

        {/* Live Statistics */}
        <LiveStats opportunities={opportunities} marketType={marketType} />

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-secondary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

      </div>

      {/* Pinned Opportunity - Full Focus Modal */}
      {pinnedOpportunity && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center backdrop-blur-xl p-4"
          onClick={() => setPinnedOpportunity(null)}
        >
          <div 
            className="relative max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning about data freshness */}
            {(() => {
              const secondsAgo = Math.floor((Date.now() - pinnedOpportunity.timestamp) / 1000);
              if (secondsAgo > 10) {
                return (
                  <div className="mb-4 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
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
                );
              }
              return null;
            })()}
            
            {/* Pinned card - enhanced */}
            <div className="bg-gradient-to-br from-dark-card to-dark-secondary border-2 border-gray-700 rounded-xl p-5 md:p-6 shadow-2xl">
              <div className="space-y-4">
                {/* Symbol and Profit */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl">
                      <CoinLogo symbol={pinnedOpportunity.symbol} size={32} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{pinnedOpportunity.symbol}</h2>
                      <span className="text-xs text-gray-400 uppercase">
                        {pinnedOpportunity.marketType}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="px-4 py-2 bg-dark-secondary rounded-lg border border-dark-border">
                      <p className="text-[10px] text-gray-400 mb-0.5">Прибыль</p>
                      <p className="text-xl font-bold text-white">
                        +{pinnedOpportunity.profitPercentage.toFixed(3)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Exchange Info */}
                <div className="grid md:grid-cols-2 gap-3">
                  {/* Buy */}
                  <div className="bg-gradient-to-br from-green-900/30 via-green-800/20 to-transparent border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-green-500/20 rounded">
                        <ExchangeLogo exchange={pinnedOpportunity.buyExchange} size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 uppercase">Купить на</p>
                        <p className="text-base font-bold text-white">{pinnedOpportunity.buyExchange}</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-400 mb-0.5">Цена покупки</p>
                      <p className="text-lg font-bold text-green-400">${pinnedOpportunity.buyPrice.toFixed(4)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrade(pinnedOpportunity, 'buy');
                      }}
                      className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold shadow-lg shadow-green-500/30"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Купить на {pinnedOpportunity.buyExchange}
                    </button>
                  </div>

                  {/* Sell */}
                  <div className="bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-transparent border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-blue-500/20 rounded">
                        <ExchangeLogo exchange={pinnedOpportunity.sellExchange} size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-gray-400 uppercase">Продать на</p>
                        <p className="text-base font-bold text-white">{pinnedOpportunity.sellExchange}</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-400 mb-0.5">Цена продажи</p>
                      <p className="text-lg font-bold text-blue-400">${pinnedOpportunity.sellPrice.toFixed(4)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrade(pinnedOpportunity, 'sell');
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold shadow-lg shadow-blue-500/30"
                    >
                      <DollarSign className="w-4 h-4" />
                      Продать на {pinnedOpportunity.sellExchange}
                    </button>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-700">
                  <div className="text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <p className="text-[10px] text-gray-500 mb-0.5">Время</p>
                    <p className="text-xs font-mono text-white">
                      {new Date(pinnedOpportunity.timestamp).toLocaleTimeString('ru-RU', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      })}
                    </p>
                  </div>
                  <div className="text-center">
                    <Zap className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                    <p className="text-[10px] text-gray-500 mb-0.5">Комиссия сети</p>
                    <p className="text-xs font-mono text-yellow-400">
                      {getNetworkInfo(pinnedOpportunity.symbol).fee}
                    </p>
                  </div>
                  <div className="text-center">
                    <ArrowRightLeft className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                    <p className="text-[10px] text-gray-500 mb-0.5">Время перевода</p>
                    <p className="text-xs font-mono text-blue-400">
                      {getNetworkInfo(pinnedOpportunity.symbol).transferTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities Grid */}
      {filteredOpps.length === 0 ? (
        <div className="card text-center py-8 md:py-12">
          <Search className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg md:text-xl font-semibold text-white mb-2">Нет возможностей</h3>
          <p className="text-sm md:text-base text-gray-400">
            {searchTerm ? 'Ничего не найдено по вашему запросу' : 'Ожидание новых арбитражных возможностей...'}
          </p>
        </div>
      ) : (
        <div className={`grid gap-3 md:gap-4 ${
          viewFormat === 'list' ? 'grid-cols-1' :
          viewFormat === 'grid-2' ? 'grid-cols-1 md:grid-cols-2' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        } ${pinnedOpportunity ? 'opacity-20 blur-md pointer-events-none' : ''}`}>
          {filteredOpps.map((opp) => {
            const uniqueKey = opp.id || generateOpportunityId(opp);
            const isPinned = pinnedOpportunity?.id === opp.id;
            return (
              <OpportunityCard
                key={uniqueKey}
                opp={opp}
                viewFormat={viewFormat}
                onTrade={handleTrade}
                getExchangeUrl={getExchangeUrl}
                isPinned={isPinned}
                onClick={handlePin}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
