#!/bin/bash
# complete-deployment.sh - Script para completar deployment MangaCount

echo "🔧 Completando deployment MangaCount..."

# 1. Crear systemd service
echo "📋 Creando systemd service..."
sudo tee /etc/systemd/system/mangacount.service > /dev/null <<EOF
[Unit]
Description=MangaCount Web API
After=network.target
After=postgresql.service

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /home/pihole/mangacount/app/MangaCount.Server.dll --urls=http://0.0.0.0:3000
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=mangacount
User=pihole
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false
Environment=ASPNETCORE_URLS=http://0.0.0.0:3000
WorkingDirectory=/home/pihole/mangacount/app

[Install]
WantedBy=multi-user.target
EOF

# 2. Reload systemd
echo "🔄 Recargando systemd..."
sudo systemctl daemon-reload

# 3. Habilitar servicio
echo "✅ Habilitando servicio mangacount..."
sudo systemctl enable mangacount

# 4. Iniciar servicio  
echo "🚀 Iniciando MangaCount..."
sudo systemctl start mangacount

# 5. Verificar status
echo "📊 Estado del servicio:"
sudo systemctl status mangacount --no-pager

echo ""
echo "🎉 ¡MangaCount desplegado exitosamente!"
echo "🌐 Acceder en: http://192.168.0.50:3000"
echo "📋 Ver logs: journalctl -u mangacount -f"