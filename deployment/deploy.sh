#!/bin/bash
set -e

# ── Configuración ────────────────────────────────────────────────
SERVER="192.168.0.50"
USER="pihole"
APP_DIR="/home/pihole/mangacount/app"
LOG_DIR="$APP_DIR/../logs"
SSH_KEY="$HOME/.ssh/id_mangacount"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLISH_DIR="$REPO_ROOT/publish"
SERVICE_NAME="mangacount"
# ─────────────────────────────────────────────────────────────────

# Si no existe la SSH key, caer en autenticación por contraseña
SSH_OPTS="-o StrictHostKeyChecking=no"
if [ -f "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

ssh_cmd() { ssh $SSH_OPTS "$USER@$SERVER" "$@"; }
ssh_tty_cmd() { ssh -tt $SSH_OPTS "$USER@$SERVER" "$@"; }
scp_cmd() { scp $SSH_OPTS "$@"; }

sudo_ssh_cmd() {
  local remote_cmd="$1"

  if [ -n "${SUDO_PASSWORD:-}" ]; then
    ssh $SSH_OPTS "$USER@$SERVER" "printf '%s\n' $(printf '%q' "$SUDO_PASSWORD") | sudo -S sh -lc $(printf '%q' "$remote_cmd")"
  else
    ssh_tty_cmd "sudo sh -lc $(printf '%q' "$remote_cmd")"
  fi
}

# Validación: verificar que nginx no esté instalado (conflicta con Pi-hole)
echo "==> [0/6] Validando entorno del servidor..."
if ssh_cmd "systemctl is-active nginx >/dev/null 2>&1"; then
  echo "⚠️  ADVERTENCIA: nginx está corriendo en $SERVER"
  echo "    nginx conflicta con Pi-hole (ambos usan puerto 80)"
  echo "    Recomendación: desactivar nginx -> sudo systemctl stop nginx && sudo systemctl disable nginx"
  echo ""
fi

echo "==> [1/6] Building frontend..."
cd "$REPO_ROOT/mangacount.client"
npm ci
npm run build

echo "==> [2/6] Publicando aplicación..."
cd "$REPO_ROOT"
dotnet publish MangaCount.Server -c Release -o "$PUBLISH_DIR" --nologo -v quiet

echo "==> [3/6] Sincronizando build del frontend..."
mkdir -p "$PUBLISH_DIR/wwwroot"
find "$PUBLISH_DIR/wwwroot" -mindepth 1 -maxdepth 1 ! -name profiles -exec rm -rf {} +
cp -a "$REPO_ROOT/mangacount.client/dist/." "$PUBLISH_DIR/wwwroot/"

echo "==> [4/6] Copiando archivos al servidor..."
ssh_cmd "mkdir -p $APP_DIR $LOG_DIR $APP_DIR/wwwroot/profiles"

# Copiar todos los archivos raíz del publish para mantener DLLs, deps, runtimeconfig y configs sincronizados
find "$PUBLISH_DIR" -maxdepth 1 -type f -print0 | while IFS= read -r -d '' file; do
  scp_cmd "$file" "$USER@$SERVER:$APP_DIR/"
done

# Refrescar wwwroot sin tocar perfiles subidos en el servidor
if [ -d "$PUBLISH_DIR/wwwroot" ]; then
  echo "    → Copiando wwwroot..."
  ssh_cmd "find $APP_DIR/wwwroot -mindepth 1 -maxdepth 1 ! -name profiles -exec rm -rf {} +"
  find "$PUBLISH_DIR/wwwroot" -mindepth 1 -maxdepth 1 ! -name profiles -print0 | while IFS= read -r -d '' file; do
    scp_cmd -r "$file" "$USER@$SERVER:$APP_DIR/wwwroot/"
  done
fi

if [ -d "$PUBLISH_DIR/recommendations" ]; then
  echo "    → Copiando recommendations..."
  ssh_cmd "rm -rf $APP_DIR/recommendations"
  scp_cmd -r "$PUBLISH_DIR/recommendations" "$USER@$SERVER:$APP_DIR/"
fi

echo "==> [5/6] Actualizando servicio y reiniciando aplicación..."
scp_cmd "$REPO_ROOT/deployment/mangacount.service" "$USER@$SERVER:/tmp/"
sudo_ssh_cmd "mv /tmp/mangacount.service /etc/systemd/system/"
sudo_ssh_cmd "systemctl daemon-reload"
sudo_ssh_cmd "systemctl enable $SERVICE_NAME >/dev/null 2>&1 || true"
sudo_ssh_cmd "systemctl restart $SERVICE_NAME"

echo "==> [6/6] Validando..."
sleep 5
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$SERVER:3000/api/profile")
if [ "$STATUS" = "200" ]; then
  STATS=$(curl -s "http://$SERVER:3000/api/database/statistics")
  echo ""
  echo "✓ Deploy exitoso. App corriendo en http://$SERVER:3000"
  echo "  Estadísticas: $STATS"
else
  echo ""
  echo "✗ La app no respondió (HTTP $STATUS). Revisá los logs:"
  echo "  ssh $SSH_OPTS $USER@$SERVER 'journalctl -u $SERVICE_NAME -n 50 --no-pager && tail -50 $LOG_DIR/backend.txt'"
  exit 1
fi
