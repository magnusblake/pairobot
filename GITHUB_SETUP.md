# 📦 Загрузка проекта на GitHub

## Шаг 1: Создание репозитория на GitHub

1. Перейдите на [github.com](https://github.com)
2. Войдите в свой аккаунт (или создайте новый)
3. Нажмите на `+` в правом верхнем углу → `New repository`
4. Заполните данные:
   - **Repository name**: `pairobot` (или любое другое имя)
   - **Description**: `Crypto Arbitrage Bot - Real-time arbitrage opportunities finder`
   - **Visibility**: `Private` (рекомендуется) или `Public`
   - ❌ НЕ ставьте галочку "Initialize this repository with a README"
5. Нажмите `Create repository`

## Шаг 2: Инициализация Git в проекте

Откройте PowerShell/Terminal в папке проекта:

```powershell
# Перейдите в папку проекта
cd C:\Users\Георгий\Desktop\pairobot

# Инициализация Git (если еще не инициализирован)
git init

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit: Crypto Arbitrage Bot"
```

## Шаг 3: Подключение к GitHub

```powershell
# Замените YOUR_USERNAME и YOUR_REPO на ваши данные
git remote add origin https://github.com/YOUR_USERNAME/pairobot.git

# Проверка подключения
git remote -v
```

## Шаг 4: Отправка кода на GitHub

```powershell
# Отправка кода
git push -u origin main

# Если ветка называется master, используйте:
# git push -u origin master
```

### Если возникла ошибка с веткой:

```powershell
# Переименуйте ветку в main
git branch -M main

# Отправьте снова
git push -u origin main
```

## Шаг 5: Настройка GitHub для безопасности

### 5.1 Создайте файл .env.example

Создайте файл `.env.example` с примером переменных (БЕЗ реальных значений):

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Server Configuration
PORT=3001
NODE_ENV=production

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### 5.2 Убедитесь, что .env в .gitignore

Файл `.env` уже добавлен в `.gitignore`, поэтому ваши секретные данные не попадут на GitHub.

## Шаг 6: Добавление README.md

Создайте красивый README для вашего проекта:

```powershell
# Файл README.md уже должен существовать
# Если нет, создайте его
```

## Шаг 7: Настройка GitHub Secrets (для CI/CD)

1. Перейдите в ваш репозиторий на GitHub
2. `Settings` → `Secrets and variables` → `Actions`
3. Нажмите `New repository secret`
4. Добавьте секреты:
   - `TELEGRAM_BOT_TOKEN`: ваш токен бота
   - `VPS_HOST`: IP вашего VPS
   - `VPS_USERNAME`: имя пользователя (обычно root)
   - `VPS_SSH_KEY`: приватный SSH ключ для доступа к VPS

## Шаг 8: Клонирование на VPS

На вашем VPS выполните:

```bash
# Перейдите в директорию
cd /var/www

# Клонируйте репозиторий
git clone https://github.com/YOUR_USERNAME/pairobot.git

# Перейдите в папку
cd pairobot

# Создайте .env файл с реальными данными
nano .env
# Скопируйте содержимое из .env.example и заполните реальными значениями

# Установите зависимости
npm install
cd frontend && npm install && cd ..

# Соберите фронтенд
cd frontend && npm run build && cd ..

# Запустите с PM2
pm2 start src/launcher.ts --name pairobot --interpreter ts-node
pm2 save
```

## Шаг 9: Обновление кода на VPS

Когда вы внесете изменения в код:

### На локальном компьютере:
```powershell
git add .
git commit -m "Описание изменений"
git push origin main
```

### На VPS:
```bash
cd /var/www/pairobot
pm2 stop pairobot
git pull origin main
npm install
cd frontend && npm install && npm run build && cd ..
pm2 restart pairobot
```

## Шаг 10: Автоматическое развертывание (опционально)

Создайте GitHub Action для автоматического развертывания:

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to VPS
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.VPS_HOST }}
        username: ${{ secrets.VPS_USERNAME }}
        key: ${{ secrets.VPS_SSH_KEY }}
        script: |
          cd /var/www/pairobot
          git pull origin main
          npm install
          cd frontend && npm install && npm run build && cd ..
          pm2 restart pairobot
```

## Полезные команды Git

```powershell
# Проверка статуса
git status

# Просмотр изменений
git diff

# Просмотр истории коммитов
git log --oneline

# Отмена последнего коммита (не отправленного)
git reset --soft HEAD~1

# Создание новой ветки
git checkout -b feature/new-feature

# Переключение между ветками
git checkout main

# Слияние веток
git merge feature/new-feature

# Удаление ветки
git branch -d feature/new-feature
```

## Решение проблем

### Ошибка: "fatal: remote origin already exists"
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/pairobot.git
```

### Ошибка: "Permission denied (publickey)"
Используйте HTTPS вместо SSH или настройте SSH ключи:
```powershell
# Генерация SSH ключа
ssh-keygen -t ed25519 -C "your_email@example.com"

# Добавление ключа на GitHub
# Скопируйте содержимое ~/.ssh/id_ed25519.pub
# Добавьте в GitHub: Settings → SSH and GPG keys → New SSH key
```

### Конфликты при git pull
```bash
# Сохраните ваши изменения
git stash

# Обновите код
git pull origin main

# Примените ваши изменения
git stash pop
```

## Готово! 🎉

Ваш проект теперь на GitHub и готов к развертыванию на VPS!

**Следующие шаги:**
1. ✅ Код на GitHub
2. ✅ Клонируйте на VPS
3. ✅ Настройте .env
4. ✅ Запустите приложение
5. ✅ Настройте автоматическое развертывание (опционально)
