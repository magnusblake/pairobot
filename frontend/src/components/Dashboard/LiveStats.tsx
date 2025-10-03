import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Activity, TrendingUp, Zap, RefreshCw } from 'lucide-react';

interface LiveStatsProps {
  opportunities: any[];
  marketType: 'spot' | 'futures';
}

export default function LiveStats({ opportunities, marketType }: LiveStatsProps) {
  const [priceChanges, setPriceChanges] = useState<Map<string, number>>(new Map());
  const [prevOpportunities, setPrevOpportunities] = useState<any[]>([]);

  useEffect(() => {
    // Track price changes
    const changes = new Map<string, number>();
    
    opportunities.forEach(opp => {
      const prev = prevOpportunities.find(p => 
        p.symbol === opp.symbol && 
        p.buyExchange === opp.buyExchange && 
        p.sellExchange === opp.sellExchange
      );
      
      if (prev) {
        const change = opp.profitPercentage - prev.profitPercentage;
        if (Math.abs(change) > 0.001) {
          changes.set(opp.id || opp.symbol, change);
        }
      }
    });
    
    setPriceChanges(changes);
    setPrevOpportunities(opportunities);
  }, [opportunities]);

  const filteredOpps = opportunities.filter(o => o.marketType === marketType);
  
  // Calculate real-time metrics
  const metrics = {
    total: filteredOpps.length,
    avgProfit: filteredOpps.length > 0 
      ? (filteredOpps.reduce((sum, o) => sum + o.profitPercentage, 0) / filteredOpps.length)
      : 0,
    maxProfit: filteredOpps.length > 0 
      ? Math.max(...filteredOpps.map(o => o.profitPercentage))
      : 0,
    uniqueSymbols: new Set(filteredOpps.map(o => o.symbol)).size,
    uniqueExchanges: new Set([
      ...filteredOpps.map(o => o.buyExchange),
      ...filteredOpps.map(o => o.sellExchange)
    ]).size,
    increasing: Array.from(priceChanges.values()).filter(c => c > 0).length,
    decreasing: Array.from(priceChanges.values()).filter(c => c < 0).length
  };

  // Get top exchanges by opportunity count
  const exchangeCounts = new Map<string, number>();
  filteredOpps.forEach(opp => {
    exchangeCounts.set(opp.buyExchange, (exchangeCounts.get(opp.buyExchange) || 0) + 1);
    exchangeCounts.set(opp.sellExchange, (exchangeCounts.get(opp.sellExchange) || 0) + 1);
  });
  
  const topExchange = Array.from(exchangeCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Average Profit */}
      <div className="card bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-500/30 p-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400 truncate">Средняя прибыль</p>
            <p className="text-lg font-bold text-green-400">{metrics.avgProfit.toFixed(3)}%</p>
          </div>
        </div>
      </div>

      {/* Max Profit */}
      <div className="card bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-500/30 p-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400 truncate">Максимум</p>
            <p className="text-lg font-bold text-yellow-400">{metrics.maxProfit.toFixed(3)}%</p>
          </div>
        </div>
      </div>

      {/* Unique Symbols */}
      <div className="card bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-500/30 p-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400 truncate">Уникальных пар</p>
            <p className="text-lg font-bold text-white">{metrics.uniqueSymbols}</p>
          </div>
        </div>
      </div>

      {/* Top Exchange */}
      <div className="card bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border-cyan-500/30 p-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-gray-400 truncate">Топ биржа</p>
            <p className="text-sm font-bold text-white truncate">
              {topExchange ? topExchange[0] : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
