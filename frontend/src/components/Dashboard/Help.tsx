import React, { useState } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  Settings, 
  Shield,
  Zap,
  ChevronRight,
  ChevronDown,
  Search
} from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: HelpArticle[];
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  steps?: string[];
  tips?: string[];
}

const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Начало работы',
    icon: BookOpen,
    content: [
      {
        id: 'what-is-arbitrage',
        title: 'Что такое арбитраж криптовалют?',
        content: 'Арбитраж криптовалют — это стратегия получения прибыли за счет разницы цен на одну и ту же криптовалюту на разных биржах. Когда цена монеты на одной бирже ниже, чем на другой, вы можете купить её дешевле и продать дороже, получив прибыль.',
        tips: [
          'Арбитраж — это низкорисковая стратегия при правильном исполнении',
          'Важно учитывать комиссии сети и бирж',
          'Скорость исполнения сделок критически важна'
        ]
      },
      {
        id: 'how-it-works',
        title: 'Как работает наш сервис?',
        content: 'Наш бот постоянно мониторит цены на криптовалюты на множестве бирж в реальном времени. Когда обнаруживается разница в ценах, которая превышает комиссии и может принести прибыль, бот отображает эту возможность в разделе "Возможности".',
        steps: [
          'Бот сканирует цены на 5+ биржах каждые несколько секунд',
          'Вычисляется потенциальная прибыль с учетом комиссий',
          'Возможности отображаются в реальном времени',
          'Вы можете вручную или автоматически совершать сделки'
        ]
      },
      {
        id: 'first-steps',
        title: 'Первые шаги',
        content: 'Чтобы начать использовать сервис, выполните следующие шаги:',
        steps: [
          'Зарегистрируйтесь и войдите в систему',
          'Изучите раздел "Возможности" — здесь отображаются текущие арбитражные возможности',
          'Настройте фильтры в разделе "Фильтры" для отбора подходящих возможностей',
          'Опционально: привяжите Telegram для получения уведомлений',
          'Для автоматической торговли: добавьте API ключи бирж в настройках'
        ]
      }
    ]
  },
  {
    id: 'opportunities',
    title: 'Работа с возможностями',
    icon: TrendingUp,
    content: [
      {
        id: 'reading-opportunities',
        title: 'Как читать карточки возможностей?',
        content: 'Каждая карточка возможности содержит всю необходимую информацию для принятия решения:',
        steps: [
          'Символ монеты (например, BTC/USDT) — торговая пара',
          'Процент прибыли — потенциальная прибыль от арбитража',
          'Биржа для покупки и цена покупки',
          'Биржа для продажи и цена продажи',
          'Время обнаружения возможности',
          'Комиссия сети для перевода',
          'Примерное время перевода между биржами'
        ],
        tips: [
          'Чем выше процент прибыли, тем выгоднее возможность',
          'Обращайте внимание на время — старые возможности могут быть неактуальны',
          'Учитывайте время перевода при планировании сделки'
        ]
      },
      {
        id: 'pinning-opportunities',
        title: 'Фиксация возможности',
        content: 'Если вы нашли интересную возможность, но она постоянно обновляется и исчезает из списка, вы можете её зафиксировать:',
        steps: [
          'Кликните на карточку возможности',
          'Карточка откроется в увеличенном виде',
          'Остальные возможности будут размыты',
          'Зафиксированная возможность не исчезнет при обновлении',
          'Кликните на размытую область, чтобы закрыть'
        ],
        tips: [
          'Используйте фиксацию, чтобы спокойно изучить детали',
          'Если прошло более 10 секунд, появится предупреждение о возможной неактуальности данных'
        ]
      },
      {
        id: 'executing-trades',
        title: 'Выполнение сделок',
        content: 'Есть два способа выполнения арбитражных сделок:',
        steps: [
          'Вручную: нажмите кнопку "Купить" или "Продать" на карточке',
          'Вы будете перенаправлены на соответствующую биржу',
          'Выполните сделку на бирже самостоятельно',
          'Автоматически: настройте автоторговлю в соответствующем разделе'
        ]
      }
    ]
  },
  {
    id: 'filters',
    title: 'Фильтры и стратегии',
    icon: Settings,
    content: [
      {
        id: 'using-filters',
        title: 'Использование фильтров',
        content: 'Фильтры помогают отобрать только те возможности, которые соответствуют вашим критериям:',
        steps: [
          'Минимальный процент прибыли — показывать только возможности с прибылью выше указанной',
          'Выбор бирж — отображать возможности только с выбранных бирж',
          'Тип рынка — споты или фьючерсы',
          'Минимальный объем — фильтр по ликвидности'
        ],
        tips: [
          'Начните с минимальной прибыли 0.5-1% для учета комиссий',
          'Выбирайте биржи, на которых у вас есть аккаунты',
          'Регулярно обновляйте фильтры в зависимости от рыночных условий'
        ]
      }
    ]
  },
  {
    id: 'autotrading',
    title: 'Автоматическая торговля',
    icon: Zap,
    content: [
      {
        id: 'setup-autotrading',
        title: 'Настройка автоторговли',
        content: 'Автоторговля позволяет боту автоматически выполнять арбитражные сделки за вас:',
        steps: [
          'Перейдите в раздел "Настройки"',
          'Добавьте API ключи от бирж (только с правами на чтение и торговлю!)',
          'Создайте стратегию в разделе "Фильтры"',
          'Включите автоторговлю в разделе "Автоторговля"',
          'Бот начнет автоматически выполнять сделки по вашей стратегии'
        ],
        tips: [
          'НИКОГДА не давайте API ключам права на вывод средств!',
          'Начните с небольших сумм для тестирования',
          'Регулярно проверяйте историю сделок',
          'Используйте стоп-лосс для ограничения рисков'
        ]
      },
      {
        id: 'api-keys-safety',
        title: 'Безопасность API ключей',
        content: 'API ключи — это доступ к вашим средствам на бирже. Соблюдайте правила безопасности:',
        steps: [
          'Создавайте API ключи только с правами "Чтение" и "Торговля"',
          'НИКОГДА не включайте право "Вывод средств"',
          'Используйте IP whitelist, если биржа это поддерживает',
          'Регулярно обновляйте API ключи',
          'Храните секретные ключи в безопасном месте'
        ]
      }
    ]
  },
  {
    id: 'telegram',
    title: 'Telegram уведомления',
    icon: DollarSign,
    content: [
      {
        id: 'setup-telegram',
        title: 'Настройка Telegram',
        content: 'Получайте мгновенные уведомления о новых возможностях прямо в Telegram:',
        steps: [
          'Перейдите в раздел "Настройки"',
          'Нажмите "Привязать Telegram"',
          'Откроется Telegram бот @p4irobot',
          'Бот автоматически привяжет ваш аккаунт',
          'Настройте типы уведомлений в настройках'
        ]
      },
      {
        id: 'notification-types',
        title: 'Типы уведомлений',
        content: 'Вы можете настроить, какие уведомления получать:',
        steps: [
          'Арбитражные возможности — новые выгодные возможности',
          'Выполненные сделки — уведомления об автоматических сделках',
          'Системные уведомления — важные системные сообщения'
        ],
        tips: [
          'Настройте минимальный процент прибыли в фильтрах, чтобы не получать слишком много уведомлений',
          'Отключите ненужные типы уведомлений для удобства'
        ]
      }
    ]
  },
  {
    id: 'safety',
    title: 'Безопасность и риски',
    icon: Shield,
    content: [
      {
        id: 'risks',
        title: 'Риски арбитража',
        content: 'Несмотря на то, что арбитраж считается низкорисковой стратегией, существуют определенные риски:',
        steps: [
          'Риск изменения цены — цена может измениться во время перевода',
          'Комиссии — высокие комиссии могут съесть прибыль',
          'Время перевода — задержки в сети блокчейна',
          'Ликвидность — недостаточный объем для выполнения сделки',
          'Технические проблемы — сбои на биржах или в сети'
        ],
        tips: [
          'Всегда учитывайте все комиссии перед сделкой',
          'Проверяйте актуальность данных',
          'Не вкладывайте средства, которые не можете позволить себе потерять',
          'Начинайте с малых сумм'
        ]
      },
      {
        id: 'best-practices',
        title: 'Лучшие практики',
        content: 'Следуйте этим рекомендациям для успешного арбитража:',
        steps: [
          'Проверяйте актуальность цен перед каждой сделкой',
          'Учитывайте ВСЕ комиссии: биржи, сети, конвертации',
          'Используйте быстрые сети для переводов (Solana, XRP, TRX)',
          'Держите средства на нескольких биржах для быстрого исполнения',
          'Ведите учет всех сделок',
          'Регулярно выводите прибыль'
        ]
      }
    ]
  }
];

export default function Help() {
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');
  const [expandedArticle, setExpandedArticle] = useState<string | null>('what-is-arbitrage');
  const [searchTerm, setSearchTerm] = useState('');

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const toggleArticle = (articleId: string) => {
    setExpandedArticle(expandedArticle === articleId ? null : articleId);
  };

  // Filter sections and articles based on search
  const filteredSections = helpSections.map(section => ({
    ...section,
    content: section.content.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.content.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 mb-2">
          <HelpCircle className="w-6 h-6" />
          Справка и документация
        </h2>
        <p className="text-gray-400 text-sm">
          Полное руководство по использованию сервиса арбитража криптовалют
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Поиск по справке..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-dark-secondary border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Help Sections */}
      <div className="space-y-3">
        {filteredSections.map((section) => (
          <div key={section.id} className="card">
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-dark-secondary/50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <section.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                <span className="text-xs text-gray-500 bg-dark-secondary px-2 py-1 rounded">
                  {section.content.length} статей
                </span>
              </div>
              {expandedSection === section.id ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Section Content */}
            {expandedSection === section.id && (
              <div className="px-4 pb-4 space-y-2">
                {section.content.map((article) => (
                  <div key={article.id} className="border border-dark-border rounded-lg overflow-hidden">
                    {/* Article Header */}
                    <button
                      onClick={() => toggleArticle(article.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-dark-secondary/30 transition-colors text-left"
                    >
                      <h4 className="font-medium text-white text-sm">{article.title}</h4>
                      {expandedArticle === article.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </button>

                    {/* Article Content */}
                    {expandedArticle === article.id && (
                      <div className="px-3 pb-3 space-y-3">
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {article.content}
                        </p>

                        {/* Steps */}
                        {article.steps && article.steps.length > 0 && (
                          <div className="bg-dark-secondary/50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-blue-400 mb-2">Шаги:</p>
                            <ol className="space-y-1.5 list-decimal list-inside">
                              {article.steps.map((step, index) => (
                                <li key={index} className="text-xs text-gray-300">
                                  {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Tips */}
                        {article.tips && article.tips.length > 0 && (
                          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                            <p className="text-xs font-semibold text-yellow-400 mb-2">💡 Советы:</p>
                            <ul className="space-y-1.5">
                              {article.tips.map((tip, index) => (
                                <li key={index} className="text-xs text-yellow-200/80 flex items-start gap-2">
                                  <span className="text-yellow-400 flex-shrink-0">•</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredSections.length === 0 && searchTerm && (
        <div className="card text-center py-12">
          <Search className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Ничего не найдено</h3>
          <p className="text-gray-400">
            Попробуйте изменить поисковый запрос
          </p>
        </div>
      )}
    </div>
  );
}
