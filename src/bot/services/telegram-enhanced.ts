import TelegramBot from 'node-telegram-bot-api';
import { TELEGRAM_CONFIG } from '../config';
import { ArbitrageOpportunity } from '../types';
import { getDatabase } from '../../database/schema';
import { OrderBookAnalysis } from '../exchanges/ccxt-base';

export interface TelegramNotificationSettings {
  userId: number;
  minProfitPercentage: number;
  enabledExchanges: string[];
  notifyOnTrade: boolean;
  notifyOnArbitrage: boolean;
  notifyOnSystem: boolean;
}

export class TelegramServiceEnhanced {
  private bot: TelegramBot;
  private messageQueue: Array<{ chatId: string; message: string; timestamp: number; retryCount: number }> = [];
  private isProcessingQueue = false;
  private readonly RATE_LIMIT_DELAY = 3000; // 3 seconds between messages
  private readonly MAX_RETRIES = 3;
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly NOTIFICATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes
  private lastNotificationTime: Map<string, number> = new Map();
  private lastErrorTime: number = 0;
  private errorBackoffDelay: number = 3000;
  private userSettings: Map<number, TelegramNotificationSettings> = new Map();
  private linkingCodes: Map<string, { userId: number; expiresAt: number }> = new Map();

  constructor() {
    if (!TELEGRAM_CONFIG.botToken) {
      console.warn('⚠️  TELEGRAM_BOT_TOKEN is not set - Telegram notifications disabled');
      // Create a dummy bot that won't crash the app
      this.bot = null as any;
      return;
    }

    try {
      this.bot = new TelegramBot(TELEGRAM_CONFIG.botToken, { polling: true });
      this.startQueueProcessor();
      this.setupBotCommands();
      this.cleanupExpiredCodes();
      console.log('✅ Telegram bot initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize Telegram bot:', error.message);
      this.bot = null as any;
    }
  }

  /**
   * Setup bot commands
   */
  private setupBotCommands() {
    if (!this.bot) return;
    
    // /start command with deep linking support
    this.bot.onText(/\/start(.*)/, async (msg, match) => {
      const chatId = msg.chat.id.toString();
      const telegramId = msg.from?.id.toString();
      const telegramUsername = msg.from?.username;
      const startParam = match?.[1]?.trim();
      
      if (!telegramId) return;

      const db = getDatabase();
      await db.ensureInitialized();
      
      // Check if user already linked
      const existingUser = db.getUserByTelegramId(telegramId);
      
      if (existingUser) {
        await this.bot.sendMessage(chatId, 
          `👋 Привет, ${existingUser.username}!\n\n` +
          `Ваш аккаунт уже привязан к боту.\n\n` +
          `Доступные команды:\n` +
          `/status - Статус бота\n` +
          `/help - Помощь\n\n` +
          `Настройки уведомлений доступны в личном кабинете на сайте.`
        );
        return;
      }

      // Handle deep link with code
      if (startParam) {
        const code = startParam.replace(/^_/, ''); // Remove leading underscore
        const linkData = this.linkingCodes.get(code);
        
        if (!linkData) {
          await this.bot.sendMessage(chatId, 
            `❌ Неверный или истекший код привязки.\n\n` +
            `Пожалуйста, получите новый код в личном кабинете на сайте.`
          );
          return;
        }

        if (Date.now() > linkData.expiresAt) {
          this.linkingCodes.delete(code);
          await this.bot.sendMessage(chatId, 
            `❌ Код привязки истек.\n\n` +
            `Пожалуйста, получите новый код в личном кабинете.`
          );
          return;
        }

        // Link account with chat ID
        const success = db.linkTelegramAccount(linkData.userId, telegramId, telegramUsername, chatId);
        
        if (success) {
          this.linkingCodes.delete(code);
          console.log(`✅ Telegram account linked: userId=${linkData.userId}, chatId=${chatId}`);
          await this.bot.sendMessage(chatId, 
            `✅ Аккаунт успешно привязан!\n\n` +
            `Теперь вы будете получать уведомления об арбитражных возможностях.\n\n` +
            `Настройки уведомлений доступны в личном кабинете на сайте.`
          );
        } else {
          await this.bot.sendMessage(chatId, '❌ Ошибка при привязке аккаунта. Попробуйте позже.');
        }
        return;
      }

      // Default start message
      await this.bot.sendMessage(chatId,
        `👋 Добро пожаловать в Arbitrage Bot!\n\n` +
        `Для привязки аккаунта:\n` +
        `1. Зайдите в личный кабинет на сайте\n` +
        `2. Нажмите кнопку "Привязать Telegram"\n` +
        `3. Вы будете автоматически перенаправлены сюда\n\n` +
        `После привязки вы будете получать уведомления о выгодных арбитражных возможностях!`
      );
    });

    // /link command (deprecated, kept for backward compatibility)
    this.bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id.toString();
      await this.bot.sendMessage(chatId, 
        `⚠️ Команда /link устарела.\n\n` +
        `Пожалуйста, используйте кнопку "Привязать Telegram" в личном кабинете на сайте.`
      );
    });

    // /settings command (removed - use web interface)

    // /status command
    this.bot.onText(/\/status/, async (msg) => {
      const chatId = msg.chat.id.toString();
      
      await this.bot.sendMessage(chatId,
        `📊 <b>Статус бота</b>\n\n` +
        `Бот работает нормально ✅\n` +
        `Очередь сообщений: ${this.messageQueue.length}\n` +
        `Активных пользователей: ${this.userSettings.size}`,
        { parse_mode: 'HTML' }
      );
    });

    // /help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id.toString();
      
      await this.bot.sendMessage(chatId,
        `📖 <b>Справка</b>\n\n` +
        `<b>Доступные команды:</b>\n` +
        `/start - Начать работу с ботом\n` +
        `/status - Статус бота\n` +
        `/help - Эта справка\n\n` +
        `<b>О боте:</b>\n` +
        `Бот отслеживает арбитражные возможности на криптобиржах и отправляет уведомления.\n\n` +
        `Настройки доступны в личном кабинете на сайте.`,
        { parse_mode: 'HTML' }
      );
    });
  }

  /**
   * Generate linking code for user
   */
  public generateLinkingCode(userId: number): string {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    
    this.linkingCodes.set(code, { userId, expiresAt });
    
    return code;
  }

  /**
   * Cleanup expired linking codes
   */
  private cleanupExpiredCodes() {
    setInterval(() => {
      const now = Date.now();
      for (const [code, data] of this.linkingCodes.entries()) {
        if (now > data.expiresAt) {
          this.linkingCodes.delete(code);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Update user notification settings
   */
  public updateUserSettings(settings: TelegramNotificationSettings) {
    this.userSettings.set(settings.userId, settings);
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor() {
    if (!this.bot) return;
    
    setInterval(() => {
      this.processQueue();
    }, this.RATE_LIMIT_DELAY);
  }

  /**
   * Process message queue
   */
  private async processQueue() {
    if (!this.bot || this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    const now = Date.now();
    if (now - this.lastErrorTime < this.errorBackoffDelay) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const { chatId, message, retryCount } = this.messageQueue[0];
      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      this.errorBackoffDelay = 3000;
      this.lastErrorTime = 0;
      this.messageQueue.shift();
    } catch (error: any) {
      console.error('Error sending Telegram message:', error.message);
      
      if (error.response?.statusCode === 429) {
        this.lastErrorTime = Date.now();
        this.errorBackoffDelay = Math.min(this.errorBackoffDelay * 2, 30000);
        
        const currentMessage = this.messageQueue[0];
        if (currentMessage.retryCount < this.MAX_RETRIES) {
          currentMessage.retryCount++;
        } else {
          this.messageQueue.shift();
        }
      } else {
        this.messageQueue.shift();
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Check if symbol is on cooldown
   */
  private isOnCooldown(symbol: string): boolean {
    const lastTime = this.lastNotificationTime.get(symbol);
    if (!lastTime) return false;

    const timeSinceLastNotification = Date.now() - lastTime;
    return timeSinceLastNotification < this.NOTIFICATION_COOLDOWN;
  }

  /**
   * Send opportunity alert to all subscribed users
   */
  async sendOpportunityAlert(opportunity: ArbitrageOpportunity): Promise<void> {
    if (!this.bot) return;
    
    if (this.isOnCooldown(opportunity.symbol)) {
      return;
    }

    const db = getDatabase();
    await db.ensureInitialized();

    // Get all users with Telegram linked
    for (const [userId, settings] of this.userSettings.entries()) {
      if (!settings.notifyOnArbitrage) continue;
      if (opportunity.profitPercentage < settings.minProfitPercentage) continue;
      
      const user = db.getUserById(userId);
      if (!user || !user.telegram_chat_id) {
        console.log(`⚠️ User ${userId} has no telegram_chat_id, skipping notification`);
        continue;
      }

      const message = this.formatOpportunityMessage(opportunity);
      console.log(`📤 Sending opportunity to user ${userId}, chatId: ${user.telegram_chat_id}`);
      this.queueMessage(user.telegram_chat_id, message);
    }

    // Also send to default chat if configured
    if (TELEGRAM_CONFIG.chatId) {
      const message = this.formatOpportunityMessage(opportunity);
      this.queueMessage(TELEGRAM_CONFIG.chatId, message);
    }

    this.lastNotificationTime.set(opportunity.symbol, Date.now());
  }

  /**
   * Send order book analysis
   */
  async sendOrderBookAnalysis(analysis: OrderBookAnalysis, chatId?: string): Promise<void> {
    if (!this.bot) return;
    
    const message = this.formatOrderBookAnalysis(analysis);
    const targetChatId = chatId || TELEGRAM_CONFIG.chatId;
    
    if (targetChatId) {
      this.queueMessage(targetChatId, message);
    }
  }

  /**
   * Queue message for sending
   */
  private queueMessage(chatId: string, message: string) {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      return;
    }

    this.messageQueue.push({
      chatId,
      message,
      timestamp: Date.now(),
      retryCount: 0
    });
  }

  /**
   * Format opportunity message
   */
  private formatOpportunityMessage(opportunity: ArbitrageOpportunity): string {
    const profitFormatted = opportunity.profitPercentage.toFixed(2);

    const formatPrice = (price: number): string => {
      if (price >= 1) return price.toFixed(2);
      else if (price >= 0.01) return price.toFixed(4);
      else if (price >= 0.0001) return price.toFixed(6);
      else return price.toFixed(8);
    };

    const buyPriceFormatted = formatPrice(opportunity.buyPrice);
    const sellPriceFormatted = formatPrice(opportunity.sellPrice);

    return `
🔍 <b>Арбитражная возможность!</b>

💱 <b>Символ:</b> ${opportunity.symbol}
📈 <b>Прибыль:</b> ${profitFormatted}%

🔵 <b>Купить:</b>
   Биржа: ${opportunity.buyExchange}
   Цена: $${buyPriceFormatted}

🔴 <b>Продать:</b>
   Биржа: ${opportunity.sellExchange}
   Цена: $${sellPriceFormatted}

⏰ <b>Время:</b> ${new Date(opportunity.timestamp).toLocaleString('ru-RU')}
`.trim();
  }

  /**
   * Format order book analysis
   */
  private formatOrderBookAnalysis(analysis: OrderBookAnalysis): string {
    return `
📊 <b>Анализ ордербука: ${analysis.symbol}</b>

💰 <b>Рекомендуемая сумма:</b> $${analysis.recommendedAmount.toFixed(2)}
📈 <b>Ликвидность:</b> ${analysis.liquidityScore.toFixed(0)}/100
📉 <b>Спред:</b> ${analysis.spreadPercentage.toFixed(3)}%

🔵 <b>Лучший бид:</b> $${analysis.bestBidPrice.toFixed(8)}
🔴 <b>Лучший аск:</b> $${analysis.bestAskPrice.toFixed(8)}

💵 <b>Объем бидов:</b> $${analysis.totalBidVolume.toFixed(2)}
💵 <b>Объем асков:</b> $${analysis.totalAskVolume.toFixed(2)}

📝 <b>Анализ:</b> ${analysis.analysis}
`.trim();
  }

  /**
   * Send notification to user
   */
  async sendNotificationToUser(userId: number, title: string, message: string): Promise<void> {
    const db = getDatabase();
    await db.ensureInitialized();
    
    const user = db.getUserById(userId);
    if (!user || !user.telegram_id) return;

    const formattedMessage = `
<b>${title}</b>

${message}
`.trim();

    this.queueMessage(user.telegram_id, formattedMessage);
  }
}
