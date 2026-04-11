# 📚 MangaCount - Gestión de Colección de Manga

Una aplicación web para gestionar colecciones de manga con una interfaz moderna. Diseñada para coleccionistas que desean llevar un registro detallado de sus series favoritas.

![MangaCount](https://img.shields.io/badge/Version-2.0.0-blue.svg)
![.NET](https://img.shields.io/badge/.NET-8.0-purple.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![WhatsApp Bot](https://img.shields.io/badge/WhatsApp-Bot-25D366.svg)

## ✨ Características Principales

### 🎯 Gestión Completa
- **Múltiples Perfiles**: Gestiona colecciones separadas para diferentes personas
- **Información Detallada**: Títulos, volúmenes comprados/totales, formato, editorial, estado de completitud
- **Sistema de Prioridades**: Marca series importantes con badges especiales
- **Seguimiento de Progreso**: Visualización del porcentaje de completitud con barras de progreso
- **Recomendaciones Inteligentes**: Sugerencias de hasta 10 mangas que no tenés, priorizando el mercado local inferido por editorial

### 🖼️ Integración Visual
- **Imágenes Automáticas**: Obtención automática de portadas desde MyAnimeList (Jikan API)
- **Placeholders Dinámicos**: Generación automática de imágenes placeholder cuando no se encuentra portada
- **Interfaz Moderna**: Diseño inspirado en manga/anime con gradientes vibrantes y efectos de cristal

### 🤖 Bot de WhatsApp
- **Consulta por chat**: Buscá series, revisá pendientes y actualizá volúmenes desde WhatsApp
- **Multi-perfil**: Seleccioná tu perfil al iniciar la conversación
- **Confirmación de cambios**: El bot pide confirmación antes de actualizar datos
- **Siempre disponible**: Corre como servicio en el servidor LAN

### 📊 Importación y Exportación
- **Importación TSV**: Carga masiva desde archivos de valores separados por tabulaciones
- **Exportación TSV**: Respaldo de colecciones en formato estándar
- **Validación de Datos**: Verificación automática durante la importación

### 🔍 Búsqueda y Filtrado
- **Búsqueda por Título**: Encuentra series rápidamente
- **Filtros Avanzados**: Por estado (completo/incompleto), prioridad
- **Vista en Cuadrícula**: Diseño responsive con tarjetas atractivas

## 🛠️ Stack Tecnológico

### Backend
- **.NET 8** - Framework principal
- **ASP.NET Core Web API** - API REST
- **Dapper** - Micro ORM para acceso a datos (SQL directo, sin EF Core)
- **Npgsql** - Driver PostgreSQL para .NET
- **Swagger/OpenAPI** - Documentación de API (solo en desarrollo)

### Frontend
- **React 19** - Framework SPA moderno
- **Vite** - Build tool y dev server
- **TypeScript** - Lenguaje de programación tipado
- **CSS Modules** - Estilos modulares y scoped
- **Vitest** - Framework de testing para React

### Base de Datos
- **PostgreSQL 16** - Sistema de gestión de base de datos
- **Modelo normalizado** - Estructura `Profile → Entry → Manga → Format / Publisher`

### Bot de WhatsApp
- **Node.js 18** - Runtime del bot
- **whatsapp-web.js** - Cliente de WhatsApp vía puppeteer
- **axios** - Cliente HTTP para comunicarse con la API
- **Google Chrome** - Browser headless requerido por puppeteer

### Arquitectura
- **Arquitectura en Capas** - Separación clara de responsabilidades
- **Dependency Injection** - Inversión de dependencias nativa de .NET
- **Repository Pattern** - Abstracción de acceso a datos
- **RESTful API** - Diseño de API siguiendo principios REST
- **Frontend embebido** - El build de React se sirve como archivos estáticos desde el propio servidor .NET
- **Motor híbrido de recomendaciones** - Reglas locales obligatorias + reranking opcional con GitHub Models y OpenRouter desde el backend

## 🚀 Instalación y Configuración (Desarrollo Local)

### Prerrequisitos
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/) y npm
- [PostgreSQL 16+](https://www.postgresql.org/download/)
- [VS Code](https://code.visualstudio.com/) o cualquier editor

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Lubonch/MangaCount.git
cd MangaCount
```

### 2. Configurar PostgreSQL

Crear la base de datos y el usuario:
```sql
CREATE USER mangacount WITH PASSWORD 'tu_password';
CREATE DATABASE "MangaCount" OWNER mangacount;
```

Aplicar el esquema:
```bash
psql -U mangacount -d MangaCount -f deployment/database-schema.sql
```

### 3. Configurar Backend

Editar `MangaCount.Server/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "MangacountDatabase": "Host=localhost;Database=MangaCount;Username=mangacount;Password=tu_password"
  }
}
```

```bash
cd MangaCount.Server
dotnet restore
dotnet build
```

### 4. Configurar Frontend
```bash
cd mangacount.client
npm install
```

### 5. Ejecutar en Desarrollo

**Terminal 1 - Backend:**
```bash
cd MangaCount.Server
dotnet run
```

**Terminal 2 - Frontend (hot reload):**
```bash
cd mangacount.client
npm run dev
```

## 📋 URLs

### Desarrollo Local
- **Aplicación**: http://localhost:5000 (o el puerto que configure Kestrel)
- **Swagger**: http://localhost:5000/swagger (solo en entorno Development)

### Producción (Servidor LAN)
- **Aplicación**: http://192.168.0.50:3000
- Ver [deployment/SSH-DEPLOY.md](deployment/SSH-DEPLOY.md) para instrucciones de despliegue.

## 📋 Uso

### 1. Gestión de Perfiles
- Crear nuevos perfiles desde el selector en la interfaz
- Cambiar entre perfiles usando el dropdown
- Los datos se mantienen separados por perfil

### 2. Agregar Manga
- Usar el botón "Agregar Manga" en la interfaz
- Completar el formulario con información detallada
- El sistema valida automáticamente los datos

### 3. Importar Colección Existente
- Usar "Importar TSV" para cargar datos masivamente
- El formato debe incluir: Título, Comprados, Total, Pendiente, Completa, Prioridad, Formato, Editorial
- Archivo de ejemplo incluido: `Inventario - Lucas.tsv`

### 4. Gestionar Entradas
- Editar manga existente con el botón "Editar"
- Eliminar entradas con el botón "Eliminar"
- Filtrar por estado de completitud o prioridad

## 🔌 API Endpoints

### Perfiles
- `GET /api/profile` - Listar todos los perfiles
- `POST /api/profile` - Crear nuevo perfil
- `GET /api/profile/{id}` - Obtener perfil específico

### Manga
- `GET /api/manga` - Obtener todos los mangas
- `POST /api/manga` - Crear nuevo manga
- `PUT /api/manga/{id}` - Actualizar manga existente
- `DELETE /api/manga/{id}` - Eliminar manga

### Entradas (colección de perfil)
- `GET /api/entry` - Obtener entradas
- `POST /api/entry` - Crear nueva entrada
- `PUT /api/entry/{id}` - Actualizar entrada
- `DELETE /api/entry/{id}` - Eliminar entrada
- `GET /api/entry/export/{profileId}` - Exportar colección a TSV
- `POST /api/entry/import/{profileId}` - Importar colección desde TSV

### Recomendaciones
- `GET /api/recommendation?profileId={id}&limit=10` - Obtener recomendaciones para un perfil

### Formatos y Editoriales
- `GET /api/format` - Listar formatos
- `GET /api/publisher` - Listar editoriales

### Base de Datos (admin)
- `GET /api/database/statistics` - Estadísticas generales
- `POST /api/database/nuke` - Limpiar todos los datos


## 📁 Estructura del Proyecto

```
MangaCount/
├── MangaCount.Server/           # Backend .NET 8 Web API
│   ├── Controllers/             # Controladores de API REST
│   ├── Models/                  # DTOs y modelos
│   ├── Services/                # Lógica de negocio
│   └── Data/                    # Acceso a datos con Dapper
├── mangacount.client/           # Frontend React 19 + Vite
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # Servicios HTTP
│   │   └── styles/              # Estilos CSS
├── MangaCount.Server.Tests/     # Pruebas unitarias (.NET)
├── deployment/                  # Scripts y guías de despliegue
│   ├── SSH-DEPLOY.md            # Guía de deploy al servidor SSH
│   └── database-schema.sql     # Esquema PostgreSQL
├── WhatsappBot/                 # Bot de WhatsApp (Node.js)
│   ├── index.js                 # Entrada: cliente WhatsApp + QR
│   ├── src/
│   │   ├── api.js               # Wrapper HTTP sobre la API de MangaCount
│   │   ├── session.js           # Estado en memoria por número de teléfono
│   │   ├── router.js            # Dispatcher de mensajes y flujos
│   │   └── commands/
│   │       ├── buscar.js        # Buscar series por título
│   │       ├── pendientes.js    # Listar series incompletas
│   │       └── actualizar.js   # Actualizar volúmenes con confirmación
│   └── .env                     # MANGA_API_URL (no versionado)
├── deployment/
│   ├── SSH-DEPLOY.md            # Guía de deploy al servidor SSH
│   ├── deploy.sh                # Script de deploy del servidor web
│   ├── deploy-bot.sh            # Script de deploy del bot
│   ├── mangacount.service       # Servicio systemd para la API
│   ├── mangacount-bot.service   # Servicio systemd para el bot
│   └── database-schema.sql     # Esquema PostgreSQL
└── Inventario - Lucas.tsv       # Archivo de importación de ejemplo
```

## � Formato TSV

El formato de importación/exportación TSV incluye estas columnas:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| Título | Nombre del manga | "Attack on Titan" |
| Comprados | Volúmenes adquiridos | 34 |
| Total | Volúmenes totales de la serie | 34 |
| Pendiente | Volúmenes faltantes (no consecutivos) | "5,12" |
| Completa | Estado de completitud | TRUE/FALSE |
| Prioridad | Marcado como prioritario | TRUE/FALSE |
| Formato | Tipo de formato | "Tankoubon" |
| Editorial | Casa editora | "Kodansha" |

## 🤖 Bot de WhatsApp — Setup

### Primer deploy (requiere escanear QR)
```bash
# Desde la raíz del proyecto
bash deployment/deploy-bot.sh
```

El script copia los archivos al servidor, instala dependencias y registra el servicio systemd. Como es la primera vez, hay que escanear el QR manualmente:

```bash
ssh -i ~/.ssh/id_mangacount pihole@192.168.0.50
cd /home/pihole/mangacount/bot
node index.js
# Escaneá el QR con WhatsApp desde el teléfono del bot
# Cuando aparezca "✅ Bot conectado y listo", presioná Ctrl+C

sudo systemctl enable --now mangacount-bot
```

A partir del primer scan, el bot arranca automáticamente con el sistema.

### Comandos disponibles
| Comando | Descripción |
|---------|-------------|
| `ping` | Test de conexión → responde `pong` |
| `buscar [título]` | Busca series en la colección del perfil activo |
| `pendientes` | Lista series incompletas, ordenadas por prioridad |
| `actualizar [título] [cantidad]` | Actualiza volúmenes con confirmación |
| `perfil` | Cambia de perfil |

### Redeploy (sin re-escanear QR)
```bash
bash deployment/deploy-bot.sh
```
La sesión de WhatsApp se preserva en `.wwebjs_auth/` en el servidor.

---

## 🛠️ Desarrollo Local

### Backend (.NET)
```bash
cd MangaCount.Server
dotnet watch run
# API disponible en http://localhost:5000 con hot reload
```

### Frontend (React)
```bash
cd mangacount.client  
npm run dev
# Aplicación disponible en http://localhost:5173 con hot reload
```

### Ejecutar Pruebas
```bash
# Pruebas backend
cd MangaCount.Server.Tests
dotnet test

# Pruebas frontend  
cd mangacount.client
npm test
```

## 🐛 Solución de Problemas

### Problemas de Conexión a Base de Datos
- Verificar que PostgreSQL esté corriendo: `sudo systemctl status postgresql`
- Revisar la cadena de conexión en `appsettings.json` o `appsettings.Production.json`
- Probar conexión directa: `psql -U mangacount -d MangaCount -h localhost`

### Issues de Build del Frontend
```bash
cd mangacount.client
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Roadmap

### ✅ **Completado**
- [x] **Backend API completo** - .NET 8 con todos los controllers
- [x] **Frontend React funcional** - UI completa con multi-perfil
- [x] **PostgreSQL** - Base de datos normalizada y en producción
- [x] **Sistema CRUD completo** - Operaciones para todas las entidades
- [x] **Importación TSV** - Carga masiva de datos funcional
- [x] **Exportación TSV** - Respaldo de colecciones
- [x] **Deploy en servidor LAN** - Corriendo en http://192.168.0.50:3000
- [x] **Bot de WhatsApp** - Consulta y actualización de colección via chat

### 🚧 **Pendiente**
- [ ] **Integración Jikan API** - Imágenes automáticas de portadas (MyAnimeList)
- [ ] **Búsqueda Avanzada** - Filtros combinados en frontend
- [ ] **Dashboard de Estadísticas** - Métricas visuales de colección
- [ ] **Testing Automatizado** - Cobertura >75% en backend y frontend
- [ ] **Paginación** - Para colecciones grandes

## 🐛 Issues Conocidos

- Formato con nombre vacío `""` puede aparecer si el TSV tiene un campo de formato en blanco
- Las imágenes de Jikan API (portadas) aún no están integradas

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- [Jikan API](https://jikan.moe/) - Datos de manga desde MyAnimeList (integración pendiente)
- [Dapper](https://github.com/DapperLib/Dapper) - Micro ORM simple y eficiente
- [Npgsql](https://www.npgsql.org/) - Driver PostgreSQL para .NET
- [React](https://react.dev/) - Framework de UI moderno y potente
- [.NET](https://dotnet.microsoft.com/) - Platform robusta para backend
- [Dapper](https://github.com/DapperLib/Dapper) - Micro ORM eficiente
- [Vite](https://vitejs.dev/) - Build tool rápido para desarrollo
- Comunidad de desarrolladores por las mejores prácticas

## 📞 Contacto y Soporte

- **GitHub Issues**: Para reportar bugs o sugerir features
- **Pull Requests**: Para contribuir al código
- **Documentación**: Revisa `PLAN.md` para roadmap detallado
