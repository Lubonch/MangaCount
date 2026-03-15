# MangaCount WhatsApp Bot

Bot de WhatsApp que se integra con la API de MangaCount para permitir gestionar tu colección de manga directamente desde WhatsApp.

## 🌟 Características

- **Gestión de Manga**: Agregar, listar, eliminar y buscar manga
- **Perfiles Múltiples**: Soporte para múltiples usuarios/colecciones
- **Estadísticas**: Ver estadísticas detalladas de tu colección
- **Búsqueda Avanzada**: Filtrar por estado (completo/incompleto/prioritario)
- **Notificaciones Admin**: Notificaciones automáticas para administradores
- **Comandos Intuitivos**: Interfaz de comandos fácil de usar

## 📋 Prerrequisitos

- Node.js (v16 o superior)
- API de MangaCount ejecutándose en `localhost:5000`
- WhatsApp instalado en tu teléfono para escanear el código QR

## 🚀 Instalación

1. **Navegar al directorio del bot:**
   ```bash
   cd src/MangaCount.WhatsAppBot
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   Edita el archivo `.env` con tus configuraciones:
   ```env
   # API Configuration
   API_BASE_URL=http://localhost:5000/api
   
   # Bot Configuration  
   SESSION_NAME=manga-bot-session
   LOG_LEVEL=info
   LOG_FILE=./logs/bot.log
   
   # Admin Configuration
   ADMIN_NUMBERS=+1234567890,+0987654321
   ```

4. **Crear directorio de logs:**
   ```bash
   mkdir logs
   ```

5. **Asegúrate de que la API esté ejecutándose:**
   ```bash
   # En el directorio raíz del proyecto
   cd src/MangaCount.API
   dotnet run
   ```

6. **Ejecutar el bot:**
   ```bash
   npm start
   ```

7. **Escanear código QR:**
   - Un código QR aparecerá en la terminal
   - Abre WhatsApp en tu teléfono
   - Ve a configuración > Dispositivos vinculados
   - Escanea el código QR
   - ¡El bot debería conectarse automáticamente!

## 📱 Comandos Disponibles

### 📚 Gestión de Manga

```
/manga add "Título" volumes:5 format:Tankoubon publisher:Editorial
/manga list
/manga delete "Título"  
/manga priority "Título"
```

**Ejemplos:**
```
/manga add "Attack on Titan" volumes:34 format:Tankoubon publisher:"Kodansha Comics"
/manga add "One Piece" volumes:105 format:Tankoubon
/manga delete "Naruto"
/manga priority "Attack on Titan"
```

### 👤 Perfiles

```
/profile list
/profile set "Nombre"
/profile create "Nombre"
```

**Ejemplos:**
```
/profile create "Lucas"
/profile set "María"
```

### 🔍 Búsqueda

```
/search "término"
/search incomplete
/search priority
/search complete
```

**Ejemplos:**
```
/search "One Piece"
/search incomplete
/search priority
```

### 📊 Estadísticas

```
/stats
```

### ℹ️ Información

```
/help
/status
```

## 🏗️ Arquitectura

```
MangaCount.WhatsAppBot/
├── index.js              # Aplicación principal del bot
├── services/
│   ├── CommandParser.js   # Parser de comandos de WhatsApp
│   ├── ApiService.js      # Comunicación con API .NET
│   └── NotificationService.js # Formateo de mensajes
├── package.json
├── .env                   # Variables de entorno
└── README.md
```

## 🔧 Configuración Avanzada

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `API_BASE_URL` | URL base de la API MangaCount | `http://localhost:5000/api` |
| `SESSION_NAME` | Nombre de la sesión de WhatsApp | `manga-bot-session` |
| `LOG_LEVEL` | Nivel de logging (error, warn, info, debug) | `info` |
| `LOG_FILE` | Archivo de logs | `./logs/bot.log` |
| `ADMIN_NUMBERS` | Números de admin separados por comas | vacío |

### Logging

El bot utiliza Winston para logging con los siguientes niveles:
- **Error**: Solo errores críticos
- **Warn**: Advertencias y errores recuperables  
- **Info**: Información general del funcionamiento
- **Debug**: Información detallada para desarrollo

Los logs se guardan en:
- `logs/error.log` - Solo errores
- `logs/combined.log` - Todos los logs
- Consola - Logs con colores

### Administradores

Los administradores reciben notificaciones cuando:
- El bot se inicia correctamente
- Ocurren errores críticos
- Se realizan acciones importantes

Para configurar administradores, agrega sus números (con código de país) en `ADMIN_NUMBERS`:
```env
ADMIN_NUMBERS=+1234567890,+0987654321
```

## 🔍 Troubleshooting

### El bot no se conecta
1. Verifica que WhatsApp esté instalado y funcional
2. Asegúrate de escanear el código QR completo
3. Revisa los logs en `logs/combined.log`

### Comandos no funcionan
1. Verifica que la API esté ejecutándose en `localhost:5000`
2. Comprueba que el perfil esté configurado con `/profile set "nombre"`
3. Revisa los logs para errores de API

### Problemas de autenticación
1. Elimina la carpeta `.wwebjs_auth` si existe
2. Reinicia el bot y escanea el código QR nuevamente
3. Asegúrate de que no hay otra instancia de WhatsApp Web abierta

### Mensajes no se reciben
1. Verifica que el bot aparezca como "en línea" en WhatsApp
2. Prueba enviando `/status` para verificar conectividad
3. Revisa que no esté en modo silencioso o bloqueado

## 📚 API de Comandos

### Formato de Comandos

Los comandos siguen este formato general:
```
/accion subcomando "parametro" key:value --flag
```

### Parsing de Parámetros

1. **Strings entre comillas**: `"Attack on Titan"`
2. **Pares clave-valor**: `volumes:34`, `format:Tankoubon`
3. **Flags/banderas**: `--priority`, `--complete`

### Validaciones

- Títulos requeridos para add, delete, priority
- Nombres de perfil requeridos para set, create
- Queries requeridas para search
- Validación automática de parámetros según comando

## 🛠️ Desarrollo

### Agregar Nuevos Comandos

1. **Actualizar CommandParser.js** para reconocer el nuevo comando
2. **Agregar handler en index.js** en el switch de `executeCommand`  
3. **Implementar lógica** en ApiService.js si requiere API
4. **Formatear respuesta** en NotificationService.js
5. **Actualizar ayuda** en `formatHelp()`

### Testing

```bash
# Ejecutar en modo desarrollo con logs detallados
LOG_LEVEL=debug npm start

# Probar parseo de comandos
node -e "
const CommandParser = require('./services/CommandParser');
const parser = new CommandParser();
console.log(parser.parse('/manga add \"Attack on Titan\" volumes:34'));
"
```

## 📄 Licencia

Este proyecto está licenciado bajo la GNU General Public License v3.0 - ver el archivo [LICENSE](../../LICENSE) para más detalles.