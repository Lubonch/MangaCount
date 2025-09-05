# 📱 Guía Completa: Acceso Remoto a MangaCount (Opción 1)

## 🎯 **OBJETIVO**
Permitir acceder a MangaCount desde tu teléfono cuando no estás en casa, hosteando la aplicación en tu PC y exponiéndola de forma segura.

## 🏗️ **ARQUITECTURA PROPUESTA**

```
Tu PC (Casa)                    Internet                    Tu Teléfono
┌─────────────────┐            ┌─────────┐                ┌─────────────┐
│                 │            │         │                │             │
│  SQL Server     │◄──────────►│  ngrok  │◄──────────────►│  Navegador  │
│  (localhost)    │            │  túnel  │                │  Móvil      │
│                 │            │         │                │             │
└─────────────────┘            └─────────┘                └─────────────┘
         ▲                           ▲                           ▲
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                             ASP.NET Core API
                             + React Frontend
```

## 📋 **PRE-REQUISITOS**

### **Hardware/Software:**
- ✅ PC con Windows
- ✅ SQL Server instalado y corriendo
- ✅ .NET 8.0 SDK
- ✅ Node.js (para el frontend)
- ✅ Conexión a internet estable

### **Cuentas:**
- 📝 Cuenta gratuita en [ngrok.com](https://ngrok.com)
- 📝 (Opcional) Cuenta en [localtunnel.me](https://localtunnel.me)

## 🚀 **PASO 1: PREPARAR LA APLICACIÓN**

### **1.1 Configurar para Producción**
```bash
# Publicar la aplicación
dotnet publish MangaCount.Server\MangaCount.Server.csproj -c Release -o publish

# Verificar que se publicó correctamente
ls publish\
```

### **1.2 Configurar Base de Datos**
```json
// appsettings.Production.json (crear nuevo archivo)
{
  "ConnectionStrings": {
    "MangacountDatabase": "Server=localhost;Database=MangaCount;TrustServerCertificate=True;Trusted_Connection=False;Integrated Security=true;"
  },
  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://0.0.0.0:5000"
      }
    }
  }
}
```

### **1.3 Probar Localmente**
```bash
# Ejecutar en modo producción
dotnet publish\MangaCount.Server.dll --environment Production

# Verificar que funciona en http://localhost:5000
```

## 🌐 **PASO 2: CONFIGURAR NГROK**

### **2.1 Instalar ngrok**
```bash
# Descargar desde https://ngrok.com/download
# O usar Chocolatey
choco install ngrok
```

### **2.2 Configurar Autenticación**
```bash
# Obtener tu auth token desde https://dashboard.ngrok.com/get-started/your-authtoken
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### **2.3 Crear Túnel Seguro**
```bash
# Crear túnel para el puerto 5000
ngrok http 5000

# Salida esperada:
# Forwarding    https://abc123.ngrok.io -> http://localhost:5000
```

### **2.4 Configuración Avanzada**
```bash
# Para subdominio personalizado (requiere plan pago)
ngrok http 5000 --subdomain=mangacount

# Para región específica (más cerca = mejor performance)
ngrok http 5000 --region=us
```

## 🔒 **PASO 3: CONFIGURACIÓN DE SEGURIDAD**

### **3.1 Firewall de Windows**
```powershell
# Abrir puerto 5000 en firewall
New-NetFirewallRule -DisplayName "MangaCount API" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

### **3.2 Configuración de CORS**
```csharp
// En Program.cs, actualizar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

app.UseCors("AllowAll");
```

### **3.3 Autenticación Básica (Opcional)**
```csharp
// Agregar middleware de autenticación básica
app.UseMiddleware<BasicAuthMiddleware>();
```

## 📱 **PASO 4: ACCESO DESDE EL TELÉFONO**

### **4.1 URL de Acceso**
```
https://abc123.ngrok.io
```

### **4.2 Verificar Conexión**
- ✅ Abrir URL en navegador del teléfono
- ✅ Verificar que carga la aplicación React
- ✅ Probar operaciones CRUD básicas
- ✅ Verificar que la base de datos responde

### **4.3 Configuración del Teléfono**
```javascript
// En el frontend, actualizar API base URL
const API_BASE_URL = window.location.origin; // Automático con ngrok
```

## 🔄 **PASO 5: AUTOMAТIZACIÓN**

### **5.1 Script de Inicio Automático**
```batch
@echo off
echo Iniciando MangaCount con ngrok...

REM Iniciar la aplicación
start /B dotnet publish\MangaCount.Server.dll --environment Production

REM Esperar que inicie
timeout /t 5 /nobreak

REM Iniciar ngrok
start /B ngrok http 5000

echo MangaCount está corriendo en: https://abc123.ngrok.io
pause
```

### **5.2 Servicio de Windows (Avanzado)**
```xml
<!-- MangaCountService.xml -->
<service>
  <id>MangaCount</id>
  <name>MangaCount API</name>
  <description>MangaCount ASP.NET Core API</description>
  <executable>%BASE%\publish\MangaCount.Server.exe</executable>
  <arguments>--environment Production</arguments>
</service>
```

## 📊 **MONITOREO Y MANTENIMIENTO**

### **6.1 Dashboard de ngrok**
```
https://dashboard.ngrok.com
```
- 📈 Ver conexiones activas
- 📊 Monitorear uso de bandwidth
- 🔍 Ver logs de requests
- ⚙️ Gestionar túneles

### **6.2 Logs de la Aplicación**
```bash
# Ver logs de la aplicación
dotnet publish\MangaCount.Server.dll --environment Production > mangacount.log 2>&1
```

### **6.3 Monitoreo de Base de Datos**
```sql
-- Verificar conexiones activas
SELECT * FROM sys.dm_exec_connections WHERE session_id > 50;

-- Verificar estado de la base de datos
SELECT name, state_desc FROM sys.databases WHERE name = 'MangaCount';
```

## 🚨 **TROUBLESHOOTING**

### **Problema: ngrok se desconecta**
```bash
# Reconectar ngrok
ngrok http 5000 --log=ngrok.log

# O usar localtunnel como alternativa
npx localtunnel --port 5000
```

### **Problema: Base de datos no conecta**
```bash
# Verificar SQL Server está corriendo
net start "SQL Server (MSSQLSERVER)"

# Verificar cadena de conexión
sqlcmd -S localhost -Q "SELECT @@VERSION"
```

### **Problema: Firewall bloquea conexiones**
```powershell
# Verificar reglas de firewall
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*MangaCount*" }

# Resetear firewall
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

## 💰 **COSTOS**

### **Gratuito:**
- ✅ ngrok: 8 horas/día de túnel activo
- ✅ LocalTunnel: Sin límites de tiempo
- ✅ SQL Server: Ya tienes instalado

### **Pago (si necesitas más):**
- 📊 ngrok Personal: $5/mes (túnel 24/7)
- 📊 ngrok Professional: $15/mes (subdominios personalizados)

## 🔄 **FLUJO DE USO DIARIO**

### **Cuando estás en casa:**
1. **Encender PC** → Aplicación inicia automáticamente
2. **ngrok crea túnel** → Obtienes URL temporal
3. **Acceder desde teléfono** → Funciona como localhost

### **Cuando sales de casa:**
1. **PC queda prendida** → Aplicación sigue corriendo
2. **ngrok mantiene túnel** → URL sigue activa
3. **Acceder desde cualquier lugar** → Datos se sincronizan automáticamente

## 🎯 **VENTAJAS DE ESTA SOLUCIÓN**

✅ **Fácil de implementar** - Solo ngrok + configuración básica
✅ **Segura** - ngrok usa HTTPS, tú controlas el acceso
✅ **Económica** - Gratuita para uso básico
✅ **Rápida** - Funciona en minutos
✅ **Flexible** - Puedes cambiar a hosting en nube después

## 📝 **SIGUIENTE PASO**

Después de completar la migración hexagonal, implementar esta configuración tomará aproximadamente **30-60 minutos**.

---

## 🎯 **RECORDATORIO POST-MIGRACIÓN**

🚨 **PRIORIDAD #1:** Implementar acceso remoto con ngrok
- ✅ Completar migración hexagonal
- ✅ Configurar ngrok
- ✅ Probar desde teléfono
- ✅ Configurar automatización

**¿Listo para continuar con la migración?** 🎉</content>
<parameter name="filePath">c:\repos\MangaCount\REMOTE_ACCESS_GUIDE.md
