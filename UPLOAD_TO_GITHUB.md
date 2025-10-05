# 🚀 Финальные шаги для загрузки на GitHub

## ✅ Что уже сделано:
- Git инициализирован
- Все файлы добавлены
- Создан первый коммит
- Ветка переименована в main

## 📝 Следующие шаги:

### Шаг 1: Создайте репозиторий на GitHub

1. Откройте браузер и перейдите на https://github.com
2. Войдите в свой аккаунт (или создайте новый на https://github.com/signup)
3. Нажмите на `+` в правом верхнем углу → `New repository`
4. Заполните:
   - **Repository name**: `pairobot` (или другое имя)
   - **Description**: `Crypto Arbitrage Bot - Real-time cryptocurrency arbitrage opportunities finder`
   - **Visibility**: Выберите `Private` (рекомендуется для безопасности)
   - ❌ **НЕ** ставьте галочку "Initialize this repository with a README"
5. Нажмите `Create repository`

### Шаг 2: Скопируйте URL репозитория

После создания репозитория GitHub покажет URL. Он будет выглядеть так:
```
https://github.com/ВАШ_USERNAME/pairobot.git
```

### Шаг 3: Выполните команды в PowerShell

Откройте PowerShell в папке проекта и выполните:

```powershell
# Подключите удаленный репозиторий (замените YOUR_USERNAME на ваш username)
git remote add origin https://github.com/YOUR_USERNAME/pairobot.git

# Отправьте код на GitHub
git push -u origin main
```

### Шаг 4: Введите учетные данные GitHub

При первой отправке GitHub попросит авторизацию:
- Введите ваш **username**
- Вместо пароля используйте **Personal Access Token**

#### Как создать Personal Access Token:
1. GitHub → Settings (ваш профиль) → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Выберите срок действия и права доступа: `repo` (полный доступ к репозиториям)
5. Скопируйте токен (он показывается только один раз!)
6. Используйте этот токен вместо пароля

### Шаг 5: Проверка

После успешной загрузки:
1. Обновите страницу вашего репозитория на GitHub
2. Вы должны увидеть все файлы проекта
3. README.md будет отображаться на главной странице

## 🔐 Важно для безопасности!

### Проверьте, что .env НЕ загружен на GitHub:

1. Откройте ваш репозиторий на GitHub
2. Убедитесь, что файла `.env` там НЕТ
3. Должен быть только `.env.example` (без реальных данных)

### Если .env случайно загружен:

```powershell
# Удалите .env из Git
git rm --cached .env

# Добавьте в .gitignore (уже добавлен)
# Создайте новый коммит
git commit -m "Remove .env from repository"

# Отправьте изменения
git push origin main

# ВАЖНО: Смените все токены и пароли, которые были в .env!
```

## 📦 Клонирование на VPS

После загрузки на GitHub, на вашем VPS выполните:

```bash
# Перейдите в директорию
cd /var/www

# Клонируйте репозиторий (замените YOUR_USERNAME)
git clone https://github.com/YOUR_USERNAME/pairobot.git

# Перейдите в папку
cd pairobot

# Создайте .env файл с реальными данными
nano .env
```

Скопируйте содержимое из вашего локального `.env` файла.

## 🔄 Обновление кода

### На локальном компьютере (после изменений):
```powershell
git add .
git commit -m "Описание изменений"
git push origin main
```

### На VPS (для получения обновлений):
```bash
cd /var/www/pairobot
pm2 stop pairobot
git pull origin main
npm install
cd frontend && npm install && npm run build && cd ..
pm2 restart pairobot
```

## 🎉 Готово!

После выполнения всех шагов:
- ✅ Код на GitHub
- ✅ Готов к клонированию на VPS
- ✅ Безопасно (без секретных данных)
- ✅ Легко обновлять

---

## 📞 Нужна помощь?

Если возникли проблемы:
1. Проверьте, что репозиторий создан на GitHub
2. Убедитесь, что URL правильный
3. Проверьте, что токен доступа имеет права `repo`
4. Посмотрите файл `GITHUB_SETUP.md` для подробных инструкций
