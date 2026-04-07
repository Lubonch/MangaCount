# Comandos para ejecutar paso a paso en tu servidor (192.168.0.50)

## 🔧 PASO 1: Instalar Dependencias
```bash
ssh pihole@192.168.0.50
```

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias básicas
sudo apt install -y curl wget apt-transport-https software-properties-common nginx git
```

## 🗄️ PASO 2: Instalar SQL Server 2022
```bash
# Añadir repositorio Microsoft
curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | sudo gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg

echo "deb [arch=amd64,armhf,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/22.04/mssql-server-2022 jammy main" | sudo tee /etc/apt/sources.list.d/mssql-server-2022.list

sudo apt update
sudo apt install -y mssql-server
```

## ⚙️ PASO 3: Configurar SQL Server
```bash
# Configurar SQL Server (IMPORTANTE!)
sudo /opt/mssql/bin/mssql-conf setup
```
**Configuración:**
- Elegir opción: **2** (Developer edition)
- Password SA: **MangaCount2024!**
- Aceptar términos: **Y**

```bash
# Verificar instalación
sudo systemctl status mssql-server
sudo systemctl enable mssql-server
```

## 🔧 PASO 4: Instalar .NET 8
```bash
# Añadir repositorio .NET
echo "deb [arch=amd64,armhf,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/22.04/prod jammy main" | sudo tee /etc/apt/sources.list.d/microsoft-prod.list

sudo apt update  
sudo apt install -y aspnetcore-runtime-8.0 dotnet-runtime-8.0

# Verificar instalación
dotnet --version
```

## 🛠️ PASO 5: Instalar SQL Server Tools
```bash
sudo apt install -y mssql-tools18 unixodbc-dev

# Añadir al PATH
echo 'export PATH="$PATH:/opt/mssql-tools18/bin"' >> ~/.bashrc
source ~/.bashrc

# Probar conexión
sqlcmd -S localhost -U sa -P MangaCount2024! -C
```

## 📁 PASO 6: Crear Estructura
```bash
# Crear directorios
mkdir -p /home/pihole/mangacount/{app,data,logs,scripts,backups}
cd /home/pihole/mangacount
```

## 📋 VERIFICACIÓN
```bash
# Verificar servicios
sudo systemctl status mssql-server
sudo systemctl status nginx
dotnet --version
sqlcmd -S localhost -U sa -P MangaCount2024! -Q "SELECT @@VERSION" -C
```

---

**Una vez completados estos pasos, avísame y continuamos con:**
1. 🔄 Migración de base de datos 
2. 📦 Despliegue de aplicación
3. 🌐 Configuración Nginx
4. 🔧 Systemd service