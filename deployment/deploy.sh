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
scp_cmd() { scp $SSH_OPTS "$@"; }

# Validación: verificar que nginx no esté instalado (conflicta con Pi-hole)
echo "==> [0/4] Validando entorno del servidor..."
if ssh_cmd "systemctl is-active nginx >/dev/null 2>&1"; then
  echo "⚠️  ADVERTENCIA: nginx está corriendo en $SERVER"
  echo "    nginx conflicta con Pi-hole (ambos usan puerto 80)"
  echo "    Recomendación: desactivar nginx -> sudo systemctl stop nginx && sudo systemctl disable nginx"
  echo ""
fi

echo "==> [1/4] Publicando aplicación..."
cd "$REPO_ROOT"
dotnet publish MangaCount.Server -c Release -o "$PUBLISH_DIR" --nologo -v quiet

echo "==> [2/4] Copiando archivos al servidor..."
ssh_cmd "mkdir -p $APP_DIR $LOG_DIR"

# Copiar todos los archivos raíz del publish para mantener DLLs, deps, runtimeconfig y configs sincronizados
find "$PUBLISH_DIR" -maxdepth 1 -type f -print0 | while IFS= read -r -d '' file; do
  scp_cmd "$file" "$USER@$SERVER:$APP_DIR/"
done

# Refrescar directorios publicados que pueden cambiar entre deploys
for dir in wwwroot recommendations; do
  if [ -d "$PUBLISH_DIR/$dir" ]; then
    echo "    → Copiando $dir..."
    ssh_cmd "rm -rf $APP_DIR/$dir"
    scp_cmd -r "$PUBLISH_DIR/$dir" "$USER@$SERVER:$APP_DIR/"
  fi
done

echo "==> [3/4] Actualizando servicio y reiniciando aplicación..."
scp_cmd "$REPO_ROOT/deployment/mangacount.service" "$USER@$SERVER:/tmp/"
ssh_cmd "sudo mv /tmp/mangacount.service /etc/systemd/system/"
ssh_cmd "sudo systemctl daemon-reload"
ssh_cmd "sudo systemctl enable $SERVICE_NAME >/dev/null 2>&1 || true"
ssh_cmd "sudo systemctl restart $SERVICE_NAME"

echo "==> [4/4] Validando..."
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
