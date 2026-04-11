# Deploy Over SSH

This guide documents the server-side deployment flow used by the repository scripts.

## Server reference

| Field | Value |
| --- | --- |
| IP | `192.168.0.50` |
| SSH user | `pihole` |
| App directory | `/home/pihole/mangacount/app/` |
| Bot directory | `/home/pihole/mangacount/bot/` |
| Shared logs directory | `/home/pihole/mangacount/logs/` |
| API URL | `http://192.168.0.50:3000` |

## Backend deploy

Run the standard backend deploy from the repository root:

```bash
bash deployment/deploy.sh
```

The script:

- publishes `MangaCount.Server` into `publish/`
- copies the published output to `/home/pihole/mangacount/app/`
- installs or refreshes `deployment/mangacount.service`
- restarts the `mangacount` systemd service
- validates `http://192.168.0.50:3000/api/profile`

Do not restart the backend with `nohup` or `pkill`. The service unit is the canonical runtime definition.

## WhatsApp bot deploy

Run the bot deploy from the repository root:

```bash
bash deployment/deploy-bot.sh
```

The script:

- syncs the tracked bot runtime into `/home/pihole/mangacount/bot/`
- preserves the server-side `.env`, `.wwebjs_auth`, `.wwebjs_cache`, and `node_modules/`
- creates `.env` from `.env.example` on the first deploy if it does not exist yet
- refreshes `deployment/mangacount-bot.service`
- installs Chromium if neither `chromium-browser` nor `chromium` is available

If the bot has never authenticated before, the script stops after installing the service file and tells you how to scan the QR code manually.

## Logs

Backend application log:

```bash
ssh pihole@192.168.0.50 'tail -f /home/pihole/mangacount/logs/backend.txt'
```

Bot application log:

```bash
ssh pihole@192.168.0.50 'tail -f /home/pihole/mangacount/logs/bot.txt'
```

Backend service journal:

```bash
ssh pihole@192.168.0.50 'journalctl -u mangacount -f --no-pager'
```

Bot service journal:

```bash
ssh pihole@192.168.0.50 'journalctl -u mangacount-bot -f --no-pager'
```

## Service status

Backend:

```bash
ssh pihole@192.168.0.50 'systemctl status mangacount --no-pager'
```

Bot:

```bash
ssh pihole@192.168.0.50 'systemctl status mangacount-bot --no-pager'
```

## First bot deploy checklist

1. Run `bash deployment/deploy-bot.sh`.
2. If the script created `/home/pihole/mangacount/bot/.env`, edit it and set `WHATSAPP_ALLOWED_NUMBERS` before starting the bot.
3. Connect to the server and run `cd /home/pihole/mangacount/bot && node index.js`.
4. Scan the QR code with the WhatsApp account assigned to the bot.
5. Stop the manual process and enable the service with `sudo systemctl enable --now mangacount-bot`.

## Database access

```bash
ssh pihole@192.168.0.50 'psql -U pihole -d MangaCount'
```

## Production configuration

`ASPNETCORE_ENVIRONMENT=Production` is set by `deployment/mangacount.service`, so the backend uses `appsettings.Production.json` on the server.
