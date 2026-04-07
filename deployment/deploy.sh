#!/bin/bash
set -e

# ── Configuración ────────────────────────────────────────────────
SERVER="192.168.0.50"
USER="pihole"
APP_DIR="/home/pihole/mangacount/app"
SSH_KEY="$HOME/.ssh/id_mangacount"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLISH_DIR="$REPO_ROOT/publish"
# ─────────────────────────────────────────────────────────────────

# Si no existe la SSH key, caer en autenticación por contraseña
SSH_OPTS="-o StrictHostKeyChecking=no"
if [ -f "$SSH_KEY" ]; then
  SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

ssh_cmd() { ssh $SSH_OPTS "$USER@$SERVER" "$@"; }
scp_cmd() { scp $SSH_OPTS "$@"; }

echo "==> [1/4] Publicando aplicación..."
cd "$REPO_ROOT"
dotnet publish MangaCount.Server -c Release -o "$PUBLISH_DIR" --nologo -v quiet

echo "==> [2/4] Copiando archivos al servidor..."
# Copiar todos los DLLs (necesario cuando cambian dependencias/NuGet packages)
scp_cmd "$PUBLISH_DIR"/*.dll "$USER@$SERVER:$APP_DIR/"

# Copiar wwwroot si existe (frontend actualizado)
if [ -d "$PUBLISH_DIR/wwwroot" ]; then
  echo "    → Copiando wwwroot (frontend)..."
  scp_cmd -r "$PUBLISH_DIR/wwwroot" "$USER@$SERVER:$APP_DIR/"
fi

echo "==> [3/4] Reiniciando aplicación..."
ssh_cmd "bash -c '
  pkill -f MangaCount.Server.dll || true
  sleep 2
  cd $APP_DIR
  nohup /usr/bin/dotnet MangaCount.Server.dll --urls=http://0.0.0.0:3000 >> manga.log 2>&1 &
  echo "PID=\$!"
'"

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
  echo "  ssh $SSH_OPTS $USER@$SERVER 'tail -50 $APP_DIR/manga.log'"
  exit 1
fi
