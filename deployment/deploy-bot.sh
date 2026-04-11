#!/bin/bash
set -e

# ── Configuración ────────────────────────────────────────────────
SERVER="192.168.0.50"
USER="pihole"
BOT_DIR="/home/pihole/mangacount/bot"
LOG_DIR="$BOT_DIR/../logs"
SSH_KEY="$HOME/.ssh/id_mangacount"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOT_SRC="$REPO_ROOT/WhatsappBot"
SERVICE_NAME="mangacount-bot"
BOT_RUNTIME_EXCLUDES=(
  "--exclude=.env"
  "--exclude=.gitignore"
  "--exclude=.wwebjs_auth"
  "--exclude=.wwebjs_cache"
  "--exclude=node_modules"
  "--exclude=*.log"
  "--exclude=*.test.js"
  "--exclude=PLAN.md"
)
# ─────────────────────────────────────────────────────────────────

SSH_OPTS="-o StrictHostKeyChecking=no"
if [ -f "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

ssh_cmd() { ssh $SSH_OPTS "$USER@$SERVER" "$@"; }
scp_cmd() { scp $SSH_OPTS "$@"; }

echo "==> [1/4] Preparando directorio en servidor..."
ssh_cmd "mkdir -p $BOT_DIR $LOG_DIR"

echo "==> [2/4] Sincronizando runtime del bot..."
ssh_cmd "rm -rf $BOT_DIR/src"
tar "${BOT_RUNTIME_EXCLUDES[@]}" -C "$BOT_SRC" -cf - . | ssh_cmd "tar -xf - -C $BOT_DIR"

if ! ssh_cmd "test -f $BOT_DIR/.env"; then
  ssh_cmd "cp $BOT_DIR/.env.example $BOT_DIR/.env"
  echo "    → .env creado desde .env.example; revisa WHATSAPP_ALLOWED_NUMBERS antes del primer arranque"
fi

echo "==> [3/4] Instalando dependencias en servidor..."
# Instalar chromium si falta (necesario para puppeteer/whatsapp-web.js)
if ! ssh_cmd "which chromium-browser >/dev/null 2>&1 || which chromium >/dev/null 2>&1"; then
  echo "    → Instalando chromium..."
  ssh_cmd "sudo apt-get install -y chromium-browser 2>/dev/null || sudo apt-get install -y chromium"
fi

ssh_cmd "cd $BOT_DIR && npm install --omit=dev"

echo "==> [4/4] Servicio systemd..."
# Copiar service file
scp_cmd "$REPO_ROOT/deployment/mangacount-bot.service" "$USER@$SERVER:/tmp/"
ssh_cmd "sudo mv /tmp/mangacount-bot.service /etc/systemd/system/"
ssh_cmd "sudo systemctl daemon-reload"

if ssh_cmd "systemctl is-active $SERVICE_NAME >/dev/null 2>&1"; then
  echo "    → Reiniciando servicio (ya existía)..."
  ssh_cmd "sudo systemctl restart $SERVICE_NAME"
  sleep 4
  ssh_cmd "sudo systemctl status $SERVICE_NAME --no-pager -l | head -20"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  PRIMER DEPLOY: necesitás escanear el QR de WhatsApp"
  echo "  Si el script creo $BOT_DIR/.env, completa WHATSAPP_ALLOWED_NUMBERS antes de seguir."
  echo ""
  echo "  1. Conectate al servidor:"
  echo "     ssh -i ~/.ssh/id_mangacount pihole@$SERVER"
  echo ""
  echo "  2. Corré el bot manualmente para escanear el QR:"
  echo "     cd $BOT_DIR && node index.js"
  echo ""
  echo "  3. Escaneá el QR con WhatsApp (un teléfono con el número del bot)"
  echo "     Esperá el mensaje 'WhatsApp client listo'"
  echo "     Luego presioná Ctrl+C para cerrar"
  echo ""
  echo "  4. Activá el servicio systemd:"
  echo "     sudo systemctl enable --now $SERVICE_NAME"
  echo ""
  echo "  Después del primer scan, el bot arranca automáticamente con el sistema."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
