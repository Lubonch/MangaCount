# MangaCount

MangaCount is a manga collection manager with four delivery surfaces: an ASP.NET Core API, a React frontend, a GitHub Pages demo, and a WhatsApp bot. The repository also includes a shared recommendation engine used by both the backend and the static demo.

## Components

- `MangaCount.Server`: ASP.NET Core API, business logic, repositories, and static hosting for the main frontend.
- `mangacount.client`: React application used by the main web app.
- `Pages`: static demo used for GitHub Pages.
- `WhatsappBot`: Node.js bot for collection queries, updates, and recommendations.
- `shared/recommendations`: shared catalog, normalization rules, country inference, and local recommendation engine.

## Functionality

- multiple collection profiles
- CRUD operations for mangas and profile entries
- TSV import and export
- local-market recommendation filtering for unowned manga
- optional backend reranking through remote providers
- collection queries and updates over WhatsApp

## Recommendation system

The recommendation system always builds a local candidate list first.

Local rules:

- owned titles are excluded after normalization
- the user market is inferred from owned volumes grouped by publisher country
- candidates outside the inferred market are excluded
- the result can contain fewer than 10 items if the local market does not have enough valid titles

Optional backend reranking can run after the local filter, but the local engine remains the required fallback.

Relevant endpoint:

- `GET /api/recommendation?profileId={id}&limit=10`

Optional backend provider environment variables:

- `MANGACOUNT_GITHUB_MODELS_ENDPOINT`
- `MANGACOUNT_GITHUB_MODELS_API_KEY`
- `MANGACOUNT_GITHUB_MODELS_MODEL`
- `MANGACOUNT_OPENROUTER_API_KEY`
- `MANGACOUNT_OPENROUTER_MODEL`
- `MANGACOUNT_OPENROUTER_ENDPOINT`

Do not store provider secrets in tracked frontend files or committed configuration.

## Requirements

- .NET 8 SDK
- Node.js 20+ and npm
- PostgreSQL 16+
- Chrome or Chromium for the WhatsApp bot

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/Lubonch/MangaCount.git
cd MangaCount
```

### 2. Create the database

Example PostgreSQL setup:

```sql
CREATE USER mangacount WITH PASSWORD 'change_me';
CREATE DATABASE "MangaCount" OWNER mangacount;
```

Apply the schema:

```bash
psql -U mangacount -d MangaCount -f deployment/database-schema.sql
```

### 3. Configure the backend

Set a valid connection string in `MangaCount.Server/appsettings.json`, `MangaCount.Server/appsettings.Development.json`, or environment-specific configuration.

Example:

```json
{
  "ConnectionStrings": {
    "MangacountDatabase": "Host=localhost;Database=MangaCount;Username=mangacount;Password=change_me;Port=5432"
  }
}
```

Restore and run the server:

```bash
cd MangaCount.Server
dotnet restore
dotnet run
```

The server prints its local URLs on startup.

### 4. Run the main frontend

```bash
cd mangacount.client
npm install
npm run dev
```

The main frontend runs on `https://localhost:63920` by default and proxies API requests to the backend.

If the development certificate is missing, generate it with:

```bash
dotnet dev-certs https --trust
```

### 5. Run the Pages demo

This demo uses the shared local recommendation engine directly and does not require the backend recommendation endpoint.

```bash
cd Pages
npm install
npm run dev
```

### 6. Run the WhatsApp bot

Install dependencies:

```bash
cd WhatsappBot
npm install
cp .env.example .env
```

Edit `WhatsappBot/.env` and set at least:

```dotenv
MANGA_API_URL=http://localhost:3000/api
WHATSAPP_ALLOWED_NUMBERS=5491112345678,5491123456789
```

Notes:

- set `MANGA_API_URL` to the actual backend URL printed by `dotnet run` in your environment.
- `WHATSAPP_ALLOWED_NUMBERS` is required for normal operation.
- numbers are normalized before comparison.
- senders not listed in the whitelist are ignored.
- if the whitelist is empty, the bot ignores all incoming messages.
- `CHROME_BIN` is optional. If it is unset, the bot tries `/usr/bin/chromium-browser`, `/usr/bin/chromium`, then `/usr/bin/google-chrome-stable`.

Start the bot:

```bash
cd WhatsappBot
npm start
```

On the first run, scan the QR code with the WhatsApp account assigned to the bot.

## WhatsApp bot commands

- `ping`
- `buscar [titulo]`
- `recomendar`
- `recomendar [cantidad]`
- `pendientes`
- `actualizar [titulo] [cantidad]`
- `perfil`

`recomendar` uses the backend recommendation endpoint for the currently selected profile.

## TSV import format

The TSV import/export format uses these fields:

- `Titulo`
- `Comprados`
- `Total`
- `Pendiente`
- `Completa`
- `Prioridad`
- `Formato`
- `Editorial`

## Tests and verification

Backend:

```bash
dotnet test MangaCount.Server.Tests --verbosity minimal
```

Main frontend:

```bash
cd mangacount.client
npm test -- --run
npm run build
```

Pages demo:

```bash
cd Pages
npm test -- --run
npm run build
```

WhatsApp bot:

```bash
cd WhatsappBot
npm test
```

## Logs

Server-side daily text logs are enabled for the backend and the WhatsApp bot.

- current backend log: `../logs/backend.txt` relative to the backend working directory
- current bot log: `../logs/bot.txt` relative to the bot working directory
- in typical local development from the repository folders, that resolves to the shared `logs/` directory at the repository root
- when the day changes and the current file has content, it is renamed to `backend.YYYY-MM-DD` or `bot.YYYY-MM-DD`
- if the current file is empty, it is not rotated

Frontend file logging is not implemented in this repository.

## Deployment

Main server deployment:

```bash
bash deployment/deploy.sh
```

WhatsApp bot deployment:

```bash
bash deployment/deploy-bot.sh
```

The bot deploy script preserves the server-side `.env` file if it already exists. If it does not exist yet, the script creates it from `WhatsappBot/.env.example` so you can fill in the allowed numbers before the first run.

Additional deployment details are in `deployment/SSH-DEPLOY.md`.

## Project layout

```text
MangaCount/
├── MangaCount.Server/
├── MangaCount.Server.Tests/
├── mangacount.client/
├── Pages/
├── WhatsappBot/
├── shared/recommendations/
├── deployment/
└── databasebackup/
```

## License

This repository is licensed under the MIT License. See `LICENSE`.
