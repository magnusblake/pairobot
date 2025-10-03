#!/bin/bash

# Скрипт обновления приложения на сервере

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

APP_DIR="/var/www/pairobot"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Обновление Crypto Arbitrage Bot     ${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Проверка что мы в правильной директории
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Директория $APP_DIR не найдена!${NC}"
    exit 1
fi

cd $APP_DIR

echo -e "${YELLOW}1. Создание бэкапа текущей версии...${NC}"
BACKUP_DIR="/root/backups/app"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Бэкап базы данных
if [ -f "pairobot.db" ]; then
    cp pairobot.db $BACKUP_DIR/pairobot_$DATE.db
    echo -e "${GREEN}База данных сохранена в $BACKUP_DIR/pairobot_$DATE.db${NC}"
fi

# Бэкап .env
if [ -f ".env" ]; then
    cp .env $BACKUP_DIR/.env_$DATE
    echo -e "${GREEN}.env файл сохранен${NC}"
fi

echo -e "${YELLOW}2. Остановка приложения...${NC}"
pm2 stop all

echo -e "${YELLOW}3. Обновление кода...${NC}"

# Если используется Git
if [ -d ".git" ]; then
    echo -e "${YELLOW}Обновление через Git...${NC}"
    git fetch --all
    git reset --hard origin/main
    git pull origin main
else
    echo -e "${YELLOW}Git репозиторий не найден.${NC}"
    echo -e "${YELLOW}Скопируйте новые файлы вручную или используйте:${NC}"
    echo -e "${GREEN}scp -r ./pairobot/src root@server:$APP_DIR/${NC}"
    read -p "Нажмите Enter когда файлы будут обновлены..."
fi

echo -e "${YELLOW}4. Установка/обновление зависимостей...${NC}"
npm install --production

echo -e "${YELLOW}5. Установка Python зависимостей...${NC}"
if [ -f "backend/requirements.txt" ]; then
    python3.9 -m pip install -r backend/requirements.txt --upgrade
fi

echo -e "${YELLOW}6. Пересборка фронтенда...${NC}"
npm run build:frontend

echo -e "${YELLOW}7. Проверка .env файла...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}.env файл не найден!${NC}"
    echo -e "${YELLOW}Восстанавливаем из бэкапа...${NC}"
    if [ -f "$BACKUP_DIR/.env_$DATE" ]; then
        cp $BACKUP_DIR/.env_$DATE .env
        echo -e "${GREEN}.env восстановлен${NC}"
    else
        echo -e "${RED}Создайте .env файл вручную!${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}8. Перезапуск Nginx...${NC}"
nginx -t && systemctl reload nginx

echo -e "${YELLOW}9. Запуск приложения...${NC}"
pm2 restart all
pm2 save

echo -e "${YELLOW}10. Проверка статуса...${NC}"
sleep 3
pm2 status

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}   Обновление завершено!               ${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Проверьте логи:${NC}"
echo -e "  ${GREEN}pm2 logs${NC}"
echo -e "\n${YELLOW}Откройте сайт:${NC}"
echo -e "  ${GREEN}https://2cakes.ru${NC}"

echo -e "\n${YELLOW}Если что-то сломалось, восстановите из бэкапа:${NC}"
echo -e "  ${GREEN}cp $BACKUP_DIR/pairobot_$DATE.db ./pairobot.db${NC}"
echo -e "  ${GREEN}pm2 restart all${NC}"
