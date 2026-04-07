#!/bin/bash
# Script de instalación para MangaCount en servidor Linux Mint
# Ejecutar como: bash install-server.sh

echo "🚀 Instalando MangaCount en servidor..."

# 1. Actualizar sistema
echo "📦 Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependencias básicas
echo "🔧 Instalando dependencias..."
sudo apt install -y curl wget apt-transport-https software-properties-common nginx git

# 3. Instalar SQL Server 2022
echo "🗄️ Instalando SQL Server 2022..."
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg

# Para Linux Mint (basado en Ubuntu 22.04)
echo "deb [arch=amd64,armhf,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/22.04/mssql-server-2022 jammy main" | sudo tee /etc/apt/sources.list.d/mssql-server-2022.list

sudo apt update
sudo apt install -y mssql-server

# 4. Configurar SQL Server
echo "⚙️ Configurando SQL Server..."
echo "EJECUTAR MANUALMENTE: sudo /opt/mssql/bin/mssql-conf setup"
echo "Elegir: 2) Developer (free, no production use rights, 10 GB database size limit)"
echo "Password SA: MangaCount2024!"

# 5. Instalar .NET 8
echo "🔧 Instalando .NET 8..."
echo "deb [arch=amd64,armhf,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/22.04/prod jammy main" | sudo tee /etc/apt/sources.list.d/microsoft-prod.list

sudo apt update
sudo apt install -y aspnetcore-runtime-8.0 dotnet-runtime-8.0

# 6. Crear estructura de directorios
echo "📁 Creando directorios..."
mkdir -p /home/pihole/mangacount/{app,data,logs,scripts,backups}

# 7. Instalar SQL Server tools
echo "🛠️ Instalando SQL Server tools..."
sudo apt install -y mssql-tools18 unixodbc-dev

# 8. Configurar PATH
echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' >> ~/.bashrc

echo "✅ Instalación de dependencias completada!"
echo "📋 Próximos pasos:"
echo "1. Ejecutar: sudo /opt/mssql/bin/mssql-conf setup"
echo "2. Reiniciar: sudo systemctl restart mssql-server"  
echo "3. Verificar: sudo systemctl status mssql-server"