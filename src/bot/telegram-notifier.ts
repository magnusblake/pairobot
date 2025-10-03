import TelegramBot from 'node-telegram-bot-api';
import { getDatabase } from '../database/schema';
import { ArbitrageOpportunity } from './types';

export class TelegramNotifier {
  private bot: TelegramBot;
  private db = getDatabase();

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupCommands();
  }

  private setupCommands(): void {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      const telegramUsername = msg.from?.username;

      if (!telegramId) return;

      // Check if user exists
      const user = this.db.getUserByTelegramId(telegramId);

      if (user) {
        this.bot.sendMessage(
          chatId,
          `👋 Добро пожаловать обратно, ${user.username}!\n\n` +
          `Ваш аккаунт уже привязан к боту.\n` +
          `Вы будете получать уведомления о найденных арбитражных возможностях.`
        );
      } else {
        this.bot.sendMessage(
          chatId,
          `👋 Добро пожаловать в Crypto Arbitrage Bot!\n\n` +
          `Для получения уведомлений привяжите ваш Telegram аккаунт в личном кабинете на сайте.\n\n` +
          `Ваш Telegram ID: \`${telegramId}\`\n` +
          `Используйте его для привязки аккаунта.`,
          { parse_mode: 'Markdown' }
        );
      }
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(
        chatId,
        `📚 Доступные команды:\n\n` +
        `/start - Начать работу с ботом\n` +
        `/help - Показать эту справку\n` +
        `/status - Проверить статус подключения\n` +
        `/stats - Показать вашу статистику\n\n` +
        `Бот автоматически отправляет уведомления о найденных арбитражных возможностях.`
      );
    });

    // Status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();

      if (!telegramId) return;

      const user = this.db.getUserByTelegramId(telegramId);

      if (user) {
        const strategies = this.db.getUserStrategies(user.id);
        const activeStrategies = strategies.filter(s => s.is_active);
        const autoTradeStrategies = strategies.filter(s => s.auto_trade_enabled);

        this.bot.sendMessage(
          chatId,
          `✅ Статус аккаунта\n\n` +
          `👤 Пользователь: ${user.username}\n` +
          `📧 Email: ${user.email}\n` +
          `🎯 Активных стратегий: ${activeStrategies.length}\n` +
          `🤖 Автоторговля: ${autoTradeStrategies.length} стратегий\n` +
          `📊 Роль: ${user.role === 'admin' ? 'Администратор' : 'Пользователь'}`
        );
      } else {
        this.bot.sendMessage(
          chatId,
          `❌ Ваш Telegram аккаунт не привязан.\n\n` +
          `Используйте /start для получения инструкций.`
        );
      }
    });

    // Stats command
    this.bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();

      if (!telegramId) return;

      const user = this.db.getUserByTelegramId(telegramId);

      if (user) {
        const trades = this.db.getUserTradeHistory(user.id, 100);
        const completedTrades = trades.filter(t => t.status === 'completed');
        const totalProfit = completedTrades.reduce((sum, t) => sum + t.profit, 0);
        const avgProfit = completedTrades.length > 0 ? totalProfit / completedTrades.length : 0;

        this.bot.sendMessage(
          chatId,
          `📊 Ваша статистика\n\n` +
          `💰 Всего сделок: ${completedTrades.length}\n` +
          `✅ Успешных: ${completedTrades.length}\n` +
          `❌ Неудачных: ${trades.filter(t => t.status === 'failed').length}\n` +
          `💵 Общая прибыль: $${totalProfit.toFixed(2)}\n` +
          `📈 Средняя прибыль: $${avgProfit.toFixed(2)}\n` +
          `🔥 Лучшая сделка: $${Math.max(...completedTrades.map(t => t.profit), 0).toFixed(2)}`
        );
      } else {
        this.bot.sendMessage(
          chatId,
          `❌ Ваш Telegram аккаунт не привязан.\n\n` +
          `Используйте /start для получения инструкций.`
        );
      }
    });
  }

  // Send arbitrage opportunity notification to users with matching strategies
  async notifyOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
    try {
      // Get all users with active strategies
      const users = this.db.getAllUsers();
      
      for (const user of users) {
        // Skip users without Telegram
        if (!user.telegram_chat_id) continue;
        
        // Get user's active strategies
        const strategies = this.db.getUserStrategies(user.id);
        const activeStrategies = strategies.filter(s => s.is_active);
        
        // Check if opportunity matches any strategy
        for (const strategy of activeStrategies) {
          const exchanges = JSON.parse(strategy.exchanges);
          const matchesExchanges = exchanges.includes(opportunity.buyExchange) || 
                                   exchanges.includes(opportunity.sellExchange);
          const matchesProfit = opportunity.profitPercentage >= strategy.min_profit_percentage;
          
          if (matchesExchanges && matchesProfit) {
            // Send notification
            const message = this.formatOpportunityMessage(opportunity);
            await this.bot.sendMessage(user.telegram_chat_id, message, { parse_mode: 'Markdown' });
            break; // Only send one notification per user
          }
        }
      }
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }

  // Send notification to specific user
  async notifyUser(telegramId: string, title: string, message: string): Promise<void> {
    try {
      await this.bot.sendMessage(
        telegramId,
        `*${title}*\n\n${message}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error sending user notification:', error);
    }
  }

  // Send trade execution notification
  async notifyTradeExecution(
    telegramId: string,
    symbol: string,
    buyExchange: string,
    sellExchange: string,
    profit: number,
    profitPercentage: number
  ): Promise<void> {
    try {
      const message = 
        `🎉 *Сделка выполнена!*\n\n` +
        `💎 Пара: ${symbol}\n` +
        `📥 Покупка: ${buyExchange}\n` +
        `📤 Продажа: ${sellExchange}\n` +
        `💰 Прибыль: $${profit.toFixed(2)}\n` +
        `📊 Процент: ${profitPercentage.toFixed(2)}%`;

      await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error sending trade notification:', error);
    }
  }

  private formatOpportunityMessage(opportunity: ArbitrageOpportunity): string {
    return (
      `🚀 *Арбитражная возможность!*\n\n` +
      `💎 Пара: ${opportunity.symbol}\n` +
      `📥 Купить на: ${opportunity.buyExchange} по $${opportunity.buyPrice.toFixed(4)}\n` +
      `📤 Продать на: ${opportunity.sellExchange} по $${opportunity.sellPrice.toFixed(4)}\n` +
      `💰 Прибыль: ${opportunity.profitPercentage.toFixed(2)}%\n` +
      `📊 Рынок: ${opportunity.marketType}\n` +
      `⏰ Время: ${new Date(opportunity.timestamp).toLocaleString('ru-RU')}`
    );
  }

  // Get bot instance for external use
  getBot(): TelegramBot {
    return this.bot;
  }
}

// Singleton instance
let notifierInstance: TelegramNotifier | null = null;

export function getTelegramNotifier(token?: string): TelegramNotifier {
  if (!notifierInstance && token) {
    notifierInstance = new TelegramNotifier(token);
  }
  if (!notifierInstance) {
    throw new Error('TelegramNotifier not initialized');
  }
  return notifierInstance;
}
