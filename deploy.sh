#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Установка Crypto Arbitrage Bot      ${NC}"
echo -e "${GREEN}   Домен: 2cakes.ru                    ${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Запустите скрипт с правами root: sudo bash deploy.sh${NC}"
    exit 1
fi

# Переменные
DOMAIN="2cakes.ru"
APP_DIR="/var/www/pairobot"
NODE_VERSION="20"
PYTHON_VERSION="3.9"

echo -e "${YELLOW}1. Обновление системы...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}2. Установка базовых зависимостей...${NC}"
apt install -y curl wget git build-essential software-properties-common

echo -e "${YELLOW}3. Установка Node.js ${NODE_VERSION}...${NC}"
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs
node --version
npm --version

echo -e "${YELLOW}4. Установка Python 3...${NC}"
apt install -y python3 python3-pip python3-venv
python3 --version

echo -e "${YELLOW}5. Установка PM2...${NC}"
npm install -g pm2
pm2 --version

echo -e "${YELLOW}6. Установка Nginx...${NC}"
apt install -y nginx
systemctl enable nginx
systemctl start nginx

echo -e "${YELLOW}7. Установка Certbot для SSL...${NC}"
apt install -y certbot python3-certbot-nginx

echo -e "${YELLOW}8. Создание директории приложения...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${YELLOW}9. Копирование файлов проекта...${NC}"
# Проверяем, есть ли файлы в текущей директории
if [ -f "package.json" ]; then
    echo -e "${GREEN}Файлы найдены в текущей директории, копируем...${NC}"
    if [ "$PWD" != "$APP_DIR" ]; then
        cp -r . $APP_DIR/
        cd $APP_DIR
    fi
else
    echo -e "${YELLOW}Файлов проекта нет в текущей директории${NC}"
    echo -e "${GREEN}Клонируйте репозиторий:${NC}"
    echo -e "${GREEN}cd /var/www && git clone https://github.com/magnusblake/pairobot.git${NC}"
    echo -e "${GREEN}Или скопируйте файлы: scp -r ./pairobot/* root@server-ip:/var/www/pairobot${NC}"
    echo -e ""
    read -p "Нажмите Enter когда файлы будут скопированы..." dummy
    cd $APP_DIR
    
    # Проверяем еще раз
    if [ ! -f "package.json" ]; then
        echo -e "${RED}package.json не найден! Убедитесь что файлы скопированы в $APP_DIR${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}10. Установка зависимостей Node.js...${NC}"
cd $APP_DIR
npm install

echo -e "${YELLOW}11. Установка зависимостей Python...${NC}"
if [ -f "backend/requirements.txt" ]; then
    python3 -m pip install -r backend/requirements.txt
else
    echo -e "${YELLOW}requirements.txt не найден, пропускаем...${NC}"
    echo -e "${YELLOW}Если нужен Python backend, создайте backend/requirements.txt${NC}"
fi

echo -e "${YELLOW}12. Сборка фронтенда...${NC}"
npm run build:frontend

echo -e "${YELLOW}13. Настройка переменных окружения...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Создание .env файла...${NC}"
    cat > .env << EOF
# API Keys
TELEGRAM_TOKEN=your_telegram_token_here
BINANCE_API_KEY=your_binance_key
BINANCE_SECRET=your_binance_secret

# Database
DATABASE_PATH=./pairobot.db

# Server
PORT=3000
NODE_ENV=production

# Frontend
VITE_API_URL=https://$DOMAIN

# Trading settings
MIN_PROFIT_PERCENTAGE=0.5
MAX_TRADE_AMOUNT=100
TRADE_ENABLED=false
EOF
    echo -e "${RED}ВАЖНО: Отредактируйте файл .env и добавьте свои API ключи!${NC}"
    echo -e "${YELLOW}Файл находится в: $APP_DIR/.env${NC}"
    read -p "Нажмите Enter после редактирования .env файла..." dummy
fi

echo -e "${YELLOW}14. Настройка Nginx...${NC}"
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
server {
    listen 80;
    server_name 2cakes.ru www.2cakes.ru;

    # Увеличиваем размер загружаемых файлов
    client_max_body_size 100M;

    # Логи
    access_log /var/log/nginx/pairobot_access.log;
    error_log /var/log/nginx/pairobot_error.log;

    # Статические файлы фронтенда
    location / {
        root /var/www/pairobot/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Кеширование статики
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API прокси
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Заголовки
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket для live обновлений
    location /ws {
        proxy_pass http://localhost:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Отключаем буферизацию для WebSocket
        proxy_buffering off;
    }
}
EOF

# Создание символической ссылки
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Удаление дефолтного конфига
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации Nginx
nginx -t

# Перезапуск Nginx
systemctl restart nginx

echo -e "${YELLOW}15. Получение SSL сертификата...${NC}"
echo -e "${GREEN}Убедитесь что DNS записи для $DOMAIN указывают на этот сервер!${NC}"
printf "Продолжить получение SSL сертификата? (y/n) "
read -r REPLY
if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect
    
    # Автообновление сертификата
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    echo -e "${GREEN}SSL сертификат установлен!${NC}"
else
    echo -e "${YELLOW}SSL пропущен. Запустите позже: certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
fi

echo -e "${YELLOW}16. Создание PM2 конфигурации...${NC}"
cat > $APP_DIR/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [
    {
      name: 'arbitrage-bot',
      script: 'src/bot/index.ts',
      interpreter: 'node',
      interpreter_args: '--loader tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'api-server',
      script: 'src/server/api.ts',
      interpreter: 'node',
      interpreter_args: '--loader tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
EOF

# Создание директории для логов
mkdir -p $APP_DIR/logs

echo -e "${YELLOW}17. Запуск приложения через PM2...${NC}"
cd $APP_DIR
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root

echo -e "${YELLOW}18. Настройка файрвола...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Установка завершена!                ${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${GREEN}Приложение доступно по адресу: https://$DOMAIN${NC}\n"

echo -e "${YELLOW}Полезные команды:${NC}"
echo -e "  Статус приложения:    ${GREEN}pm2 status${NC}"
echo -e "  Логи бота:            ${GREEN}pm2 logs arbitrage-bot${NC}"
echo -e "  Логи API:             ${GREEN}pm2 logs api-server${NC}"
echo -e "  Перезапуск:           ${GREEN}pm2 restart all${NC}"
echo -e "  Остановка:            ${GREEN}pm2 stop all${NC}"
echo -e "  Статус Nginx:         ${GREEN}systemctl status nginx${NC}"
echo -e "  Логи Nginx:           ${GREEN}tail -f /var/log/nginx/pairobot_error.log${NC}"
echo -e "  Обновление SSL:       ${GREEN}certbot renew${NC}"

echo -e "\n${RED}НЕ ЗАБУДЬТЕ:${NC}"
echo -e "1. Отредактировать .env файл с реальными API ключами"
echo -e "2. Проверить что DNS записи для $DOMAIN указывают на этот сервер"
echo -e "3. Настроить бэкапы базы данных pairobot.db"
