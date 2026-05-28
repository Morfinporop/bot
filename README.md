# SoundForge — Discord Music Bot

## Быстрый деплой на Railway

### 1. Создай репозиторий на GitHub
- Загрузи эти файлы в новый репозиторий

### 2. Деплой на Railway
1. Зайди на [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Выбери свой репозиторий

### 3. Добавь переменные (Variables)
В Railway Dashboard → твой проект → Variables:

```
DISCORD_TOKEN=твой_токен_бота
CLIENT_ID=1509625871797977300
GUILD_ID=1459972063346557035
```

### 4. Зарегистрируй команды
В Railway → Settings → найди раздел "Custom Start Command" или используй локально:
```bash
npm run deploy
```

### 5. Готово!
Бот должен появиться онлайн. Используй `/play` в Discord.

---

## Команды

| Команда | Описание |
|---------|----------|
| `/play <запрос>` | Воспроизвести трек |
| `/skip` | Пропустить |
| `/stop` | Остановить |
| `/queue` | Очередь |
| `/np` | Текущий трек |
| `/volume <1-100>` | Громкость |

## Поддерживаемые источники
- SoundCloud
- Spotify
- Apple Music
- Прямые URL

> YouTube официально не поддерживается в discord-player v7

## Требования
- Node.js 20+
- FFmpeg (в Railway уже есть)
