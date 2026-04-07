#!/bin/bash
# deploy-mangacount.sh - Script para desplegar MangaCount en servidor
# Ejecutar después de la instalación de dependencias

echo "🚀 Desplegando MangaCount..."

APP_DIR="/home/pihole/mangacount/app"
DB_NAME="MangaCount"  
DB_USER="pihole"
DB_PASSWORD="MangaCount2024!"

#!/bin/bash
# deploy-mangacount.sh - Script para desplegar MangaCount en servidor con PostgreSQL
# Ejecutar después de la instalación de PostgreSQL

echo "🚀 Desplegando MangaCount..."

APP_DIR="/home/pihole/mangacount/app"
DB_NAME="MangaCount"  
DB_USER="pihole"
DB_PASSWORD="MangaCount2024!"

# 1. Verificar PostgreSQL funcionando
echo "🔍 Verificando PostgreSQL..."
sudo systemctl status postgresql --no-pager

# 2. Ejecutar schema de base de datos
echo "📋 Ejecutando schema PostgreSQL..."
if [ -f "database-schema.sql" ]; then
    psql -h localhost -U $DB_USER -d $DB_NAME -f database-schema.sql
    echo "✅ Schema PostgreSQL aplicado correctamente"
else
    echo "⚠️ Archivo database-schema.sql no encontrado"
fi

# 3. MangaCount se ejecutará en puerto 3000 directo (sin nginx)
echo "🌐 MangaCount configurado para puerto 3000..."
echo "✅ No es necesario nginx - MangaCount accesible en http://192.168.0.50:3000"

# 4. Crear service de systemd
echo "🔧 Creando systemd service..."
sudo tee /etc/systemd/system/mangacount.service > /dev/null <<EOF
[Unit]
Description=MangaCount Web API
After=network.target
After=postgresql.service

[Service]
Type=notify
ExecStart=/usr/bin/dotnet $APP_DIR/MangaCount.Server.dll --urls=http://0.0.0.0:3000
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=mangacount
User=pihole
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=ASPNETCORE_URLS=http://0.0.0.0:3000
WorkingDirectory=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Deployment scripts creados"
echo "📋 Para completar:"
echo "1. Copiar aplicación compilada a $APP_DIR"  
echo "2. Actualizar cadena de conexión"
echo "3. sudo systemctl enable mangacount"
echo "4. sudo systemctl start mangacount"