import React, { useState } from 'react';
import OpportunitiesList from './OpportunitiesList';
import FiltersManager from './StrategiesManager';
import AutoTrading from './AutoTrading';
import TradeHistory from './TradeHistory';
import Settings from './Settings';
import Help from './Help';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Filter, Bot, History, Settings as SettingsIcon, Lock, AlertCircle, HelpCircle } from 'lucide-react';

type Tab = 'opportunities' | 'filters' | 'autotrading' | 'history' | 'settings' | 'help';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('opportunities');
  const [showHistoryNotification, setShowHistoryNotification] = useState(false);
  const [notificationTimer, setNotificationTimer] = useState<NodeJS.Timeout | null>(null);

  const tabs = [
    { id: 'opportunities' as Tab, name: 'Возможности', icon: TrendingUp },
    { id: 'filters' as Tab, name: 'Фильтры', icon: Filter },
    { id: 'autotrading' as Tab, name: 'Автоторговля', icon: Bot },
    { id: 'history' as Tab, name: 'История', icon: History },
    { id: 'settings' as Tab, name: 'Настройки', icon: SettingsIcon },
    { id: 'help' as Tab, name: 'Помощь', icon: HelpCircle },
  ];

  const handleHistoryClick = () => {
    if (!user?.auto_trade_enabled) {
      // Clear existing timer if any
      if (notificationTimer) {
        clearTimeout(notificationTimer);
      }
      
      // Show notification
      setShowHistoryNotification(true);
      
      // Set new timer
      const timer = setTimeout(() => {
        setShowHistoryNotification(false);
      }, 5000);
      setNotificationTimer(timer);
    } else {
      setActiveTab('history');
    }
  };

  const closeNotification = () => {
    if (notificationTimer) {
      clearTimeout(notificationTimer);
    }
    setShowHistoryNotification(false);
  };

  return (
    <div className="container mx-auto">
      {/* History Notification */}
      {showHistoryNotification && (
        <div className="mb-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 relative overflow-hidden animate-slide-up" style={{
          animation: showHistoryNotification ? 'slideUp 0.3s ease-out' : 'fadeOut 0.3s ease-out'
        }}>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-yellow-500 animate-progress" style={{
            animation: 'progress 5s linear forwards'
          }}></div>
          
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-400 mb-1">История недоступна</h3>
              <p className="text-xs text-gray-300 mb-2">
                Для доступа к истории сделок необходимо включить автоторговлю во вкладке "Автоторговля"
              </p>
              <button
                onClick={() => {
                  setActiveTab('autotrading');
                  closeNotification();
                }}
                className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Bot className="w-3 h-3" />
                Перейти к автоторговле
              </button>
            </div>
            <button
              onClick={closeNotification}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tabs - Mobile: Scrollable, Desktop: Normal */}
      <div className="mb-6 md:mb-8 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="border-b border-dark-border">
          <nav className="flex space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isHistoryLocked = tab.id === 'history' && !user?.auto_trade_enabled;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => tab.id === 'history' ? handleHistoryClick() : setActiveTab(tab.id)}
                  className={`
                    py-3 md:py-4 px-3 md:px-2 border-b-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-2
                    ${isHistoryLocked 
                      ? 'border-transparent text-gray-600 cursor-pointer opacity-50 hover:opacity-70' 
                      : activeTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    }
                  `}
                >
                  {isHistoryLocked ? <Lock className="w-4 h-4" /> : <tab.icon className="w-4 h-4" />}
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeTab === 'opportunities' && <OpportunitiesList />}
        {activeTab === 'filters' && <FiltersManager />}
        {activeTab === 'autotrading' && <AutoTrading />}
        {activeTab === 'history' && (
          user?.auto_trade_enabled ? (
            <TradeHistory />
          ) : (
            <div className="card text-center py-12">
              <Lock className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">История недоступна</h3>
              <p className="text-gray-400 mb-6">
                Для доступа к истории сделок необходимо включить автоторговлю в настройках
              </p>
              <button
                onClick={() => setActiveTab('settings')}
                className="btn-primary inline-flex items-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
                Перейти в настройки
              </button>
            </div>
          )
        )}
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'help' && <Help />}
      </div>
    </div>
  );
}
