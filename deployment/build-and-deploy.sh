#!/bin/bash
# build-and-deploy.sh - Compilar y desplegar MangaCount al servidor

SERVER_IP="192.168.0.50"
SERVER_USER="pihole" 
APP_DIR="/home/pihole/mangacount/app"

echo "🏗️ Compilando MangaCount para production..."

# 1. Limpiar build anterior
echo "🧹 Limpiando builds anteriores..."
rm -rf ./publish

# 2. Compilar aplicación para Linux
echo "📦 Compilando aplicación .NET..."
dotnet publish MangaCount.Server/MangaCount.Server.csproj \
    --configuration Release \
    --runtime linux-x64 \
    --self-contained false \
    --output ./publish

if [ $? -ne 0 ]; then
    echo "❌ Error en compilación"
    exit 1
fi

echo "✅ Compilación exitosa"

# 3. Copiar archivos al servidor
echo "🚀 Transfiriendo archivos al servidor..."

# Crear directorio si no existe
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"

# Transferir aplicación
rsync -avz --progress ./publish/ $SERVER_USER@$SERVER_IP:$APP_DIR/

# Transferir scripts de deployment
scp deployment/deploy-mangacount.sh $SERVER_USER@$SERVER_IP:~/
scp deployment/database-schema.sql $SERVER_USER@$SERVER_IP:~/ 2>/dev/null || echo "⚠️ Schema SQL no encontrado"

echo "✅ Archivos transferidos"

# 4. Ejecutar deployment en servidor
echo "🔧 Ejecutando deployment en servidor..."
ssh $SERVER_USER@$SERVER_IP "
    chmod +x ~/deploy-mangacount.sh
    ~/./deploy-mangacount.sh
"

# 5. Iniciar servicio
echo "🚀 Iniciando MangaCount service..."
ssh $SERVER_USER@$SERVER_IP "
    sudo systemctl daemon-reload
    sudo systemctl enable mangacount
    sudo systemctl start mangacount
    sudo systemctl status mangacount --no-pager
"

echo ""
echo "🎉 ¡Deployment completado!"
echo "🌐 MangaCount disponible en: http://$SERVER_IP:3000"
echo "📋 Verificar status: ssh $SERVER_USER@$SERVER_IP 'sudo systemctl status mangacount'"