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
# ─────────────────────────────────────────────────────────────────

SSH_OPTS="-o StrictHostKeyChecking=no"
if [ -f "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

ssh_cmd() { ssh $SSH_OPTS "$USER@$SERVER" "$@"; }
scp_cmd() { scp $SSH_OPTS "$@"; }

echo "==> [1/4] Preparando directorio en servidor..."
ssh_cmd "mkdir -p $BOT_DIR/src/commands $LOG_DIR"

echo "==> [2/4] Copiando archivos del bot..."
# Archivos raíz
scp_cmd "$BOT_SRC/index.js"    "$USER@$SERVER:$BOT_DIR/"
scp_cmd "$BOT_SRC/package.json" "$USER@$SERVER:$BOT_DIR/"

# .env: solo copiar si NO existe ya en el servidor (preservar config del server)
if ! ssh_cmd "test -f $BOT_DIR/.env"; then
  scp_cmd "$BOT_SRC/.env" "$USER@$SERVER:$BOT_DIR/"
  echo "    → .env copiado (primera vez)"
fi

# src/
scp_cmd "$BOT_SRC/src/api.js"    "$USER@$SERVER:$BOT_DIR/src/"
scp_cmd "$BOT_SRC/src/authorization.js" "$USER@$SERVER:$BOT_DIR/src/"
scp_cmd "$BOT_SRC/src/session.js" "$USER@$SERVER:$BOT_DIR/src/"
scp_cmd "$BOT_SRC/src/router.js"  "$USER@$SERVER:$BOT_DIR/src/"
scp_cmd "$BOT_SRC/src/commands/buscar.js"     "$USER@$SERVER:$BOT_DIR/src/commands/"
scp_cmd "$BOT_SRC/src/commands/pendientes.js" "$USER@$SERVER:$BOT_DIR/src/commands/"
scp_cmd "$BOT_SRC/src/commands/actualizar.js" "$USER@$SERVER:$BOT_DIR/src/commands/"
scp_cmd "$BOT_SRC/src/commands/recomendar.js" "$USER@$SERVER:$BOT_DIR/src/commands/"

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
