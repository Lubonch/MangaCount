# 📚 MangaCount - Gestión de Colección de Manga

Una elegante aplicación web para gestionar colecciones de manga con una interfaz moderna y atractiva, **ahora con bot de WhatsApp integrado** para gestionar tu colección desde tu teléfono. Diseñada para coleccionistas que desean llevar un registro detallado de sus series favoritas.

![MangaCount](https://img.shields.io/badge/Version-2.0.0-blue.svg)
![.NET](https://img.shields.io/badge/.NET-10.0-purple.svg)
![Angular](https://img.shields.io/badge/Angular-21-red.svg)
![WhatsApp Bot](https://img.shields.io/badge/WhatsApp-Bot-green.svg)
![License](https://img.shields.io/badge/License-GPL%20v3.0-green.svg)

## ✨ Características Principales

### 📱 Bot de WhatsApp Integrado
- **Gestión Móvil**: Controla tu colección directamente desde WhatsApp
- **Comandos Intuitivos**: Interfaz de texto simple con respuestas inteligentes
- **Sincronización Completa**: Los cambios se reflejan instantáneamente en la web
- **Multi-perfil**: Soporte para múltiples usuarios desde el mismo bot

### 🎯 Gestión Completa
- **Múltiples Perfiles**: Gestiona colecciones separadas para diferentes personas
- **Información Detallada**: Títulos, volúmenes comprados/totales, formato, editorial, estado de completitud
- **Sistema de Prioridades**: Marca series importantes con badges especiales
- **Seguimiento de Progreso**: Visualización del porcentaje de completitud con barras de progreso

### 🖼️ Integración Visual
- **Imágenes Automáticas**: Obtención automática de portadas desde MyAnimeList (Jikan API)
- **Placeholders Dinámicos**: Generación automática de imágenes placeholder cuando no se encuentra portada
- **Interfaz Moderna**: Diseño inspirado en manga/anime con gradientes vibrantes y efectos de cristal

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
- **.NET 10** - Framework principal
- **ASP.NET Core Web API** - API REST
- **Entity Framework Core** - ORM
- **SQLite** - Base de datos local
- **CsvHelper** - Procesamiento de archivos TSV

### Frontend
- **Angular 21** - Framework SPA
- **Angular Material** - Componentes UI
- **TypeScript** - Lenguaje de programación
- **SCSS** - Estilos avanzados con gradientes y animaciones
- **RxJS** - Programación reactiva

### WhatsApp Bot
- **Node.js** - Runtime de JavaScript
- **whatsapp-web.js** - Librería de WhatsApp Web
- **Winston** - Sistema de logging
- **Axios** - Cliente HTTP para comunicación con API
- **dotenv** - Gestión de variables de entorno

### Arquitectura
- **Clean Architecture / Hexagonal** - Separación de responsabilidades
- **Domain-Driven Design** - Modelado centrado en el dominio
- **Dependency Injection** - Inversión de dependencias
- **Repository Pattern** - Abstracción de datos

## 🚀 Instalación y Configuración

### Prerrequisitos
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 18+](https://nodejs.org/) y npm
- Git

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Lubonch/MangaCount.git
cd MangaCount
```

### 2. Configurar Backend
```bash
# Construir la solución
dotnet build src/MangaCount.API

# Publicar aplicación auto-contenida
dotnet publish src/MangaCount.API --self-contained --configuration Release --runtime linux-x64 --output ./published
```

### 3. Configurar Frontend
```bash
cd frontend/manga-count-app
npm install
```

### 4. Ejecutar la Aplicación

#### Backend (API)
```bash
# Desde la raíz del proyecto
./published/MangaCount.API
# La API estará disponible en http://localhost:5000
```

#### Frontend
```bash
cd frontend/manga-count-app
npm start
# La aplicación estará disponible en http://localhost:4200
```

## 📋 Uso

### 1. Gestión de Perfiles
- Crear nuevos perfiles desde el selector en el header
- Cambiar between perfiles usando el dropdown
- Los datos se mantienen separados por perfil

### 2. Agregar Manga
- Usar el botón "Agregar Manga" en la barra superior
- Completar el formulario con información detallada
- Las imágenes se obtienen automáticamente

### 3. Importar Colección Existente
- Usar "Importar TSV" para cargar datos masivamente
- El formato debe incluir: Título, Comprados, Total, Pendiente, Completa, Prioridad, Formato, Editorial
- Ejemplo de TSV incluido: `Inventario - Lucas.tsv`

### 4. Gestionar Entradas
- Editar manga existente con click en "Editar"
- Eliminar entradas con el botón "Eliminar"
- Filtrar por estado de completitud o prioridad

## 📱 Bot de WhatsApp

MangaCount incluye un bot de WhatsApp que permite gestionar tu colección directamente desde WhatsApp usando comandos de texto.

### Características del Bot
- 📚 **Gestión completa de manga** - Agregar, listar, eliminar y buscar
- 👤 **Soporte multi-perfil** - Cambiar entre diferentes usuarios/colecciones  
- 🔍 **Búsqueda avanzada** - Filtrar por estado, prioridad o término de búsqueda
- 📊 **Estadísticas detalladas** - Ver resúmenes de tu colección
- 🤖 **Comandos intuitivos** - Interfaz fácil de usar con mensajes de ayuda

### Configuración del Bot

1. **Prerequisitos:**
   ```bash
   # Asegurar que la API esté ejecutándose
   cd src/MangaCount.API
   dotnet run
   ```

2. **Instalar dependencias del bot:**
   ```bash
   cd src/MangaCount.WhatsAppBot
   npm install
   ```

3. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Editar .env con tus configuraciones (opcional)
   ```

4. **Ejecutar el bot:**
   ```bash
   # Opción 1: Usar el script de inicio (recomendado)
   ./start.sh

   # Opción 2: Ejecutar manualmente
   node index.js
   ```

5. **Conectar WhatsApp:**
   - Escanear el código QR que aparece en la terminal
   - Abrir WhatsApp → Configuración → Dispositivos vinculados
   - Escanear el código QR
   - ¡El bot estará listo para usar!

### Comandos del Bot

```bash
# Gestión de perfiles
/profile create "Tu Nombre"
/profile set "Tu Nombre" 
/profile list

# Agregar manga  
/manga add "Attack on Titan" volumes:34 format:Tankoubon
/manga add "One Piece" volumes:105

# Ver y gestionar colección
/manga list
/manga delete "Naruto"
/manga priority "Attack on Titan"

# Búsqueda y estadísticas
/search "One Piece"
/search incomplete
/search priority
/stats

# Ayuda e información
/help
/status
```

Para más información detallada sobre el bot, ver: [`src/MangaCount.WhatsAppBot/README.md`](src/MangaCount.WhatsAppBot/README.md)

```
MangaCount/
├── src/
│   ├── MangaCount.API/           # Controladores Web API
│   ├── MangaCount.Application/   # Servicios de aplicación
│   ├── MangaCount.Domain/        # Entidades y lógica de dominio
│   ├── MangaCount.Infrastructure/ # Acceso a datos y contexto
│   └── MangaCount.WhatsAppBot/   # Bot de WhatsApp con Node.js
├── frontend/manga-count-app/     # Aplicación Angular
│   ├── src/app/
│   │   ├── components/          # Componentes Angular
│   │   ├── services/           # Servicios HTTP y lógica
│   │   ├── models/             # Interfaces TypeScript
│   │   └── app.*               # Componente principal
├── tests/                      # Pruebas unitarias
├── docs/                       # Documentación
└── published/                  # Build de producción
```

## 🔌 API Endpoints

### Perfiles
- `GET /api/profiles` - Listar todos los perfiles
- `POST /api/profiles` - Crear nuevo perfil
- `GET /api/profiles/{id}` - Obtener perfil específico

### Manga
- `GET /api/manga/profile/{profileId}` - Obtener manga de un perfil
- `POST /api/manga` - Crear nueva entrada
- `PUT /api/manga/{id}` - Actualizar entrada existente
- `DELETE /api/manga/{id}` - Eliminar entrada
- `POST /api/manga/profile/{profileId}/import-tsv` - Importar desde TSV
- `GET /api/manga/profile/{profileId}/export-tsv` - Exportar a TSV

### Búsqueda y Filtrado
- Parámetros de consulta: `search`, `incomplete`, etc.

## 🎨 Interfaz Visual

La aplicación cuenta con un diseño moderno y atractivo que incluye:

- **Fondo Dinámico**: Gradientes multi-color con efectos de partículas
- **Tarjetas de Cristal**: Efectos backdrop-filter y bordes semi-transparentes
- **Animaciones Fluidas**: Transiciones suaves con cubic-bezier timing
- **Hover Effects**: Elevación 3D y scaling en interacciones
- **Paleta Vibrante**: Colores inspirados en manga/anime (purple-pink-blue)
- **Tags Coloridos**: Cada categoría con gradientes únicos
- **Badges Animados**: Efectos glow pulsante para prioridades

## 🔄 TSV Format

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

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Desarrollo Local

Para contribuir al proyecto:

```bash
# Backend - Ejecutar con hot reload
dotnet watch --project src/MangaCount.API

# Frontend - Desarrollo con live reload
cd frontend/manga-count-app
ng serve --open
```

## 📝 Roadmap

### ✅ Fase 2 - Completada (Bot WhatsApp)
- [x] **Bot de WhatsApp**: Gestión completa de manga por WhatsApp ✨
- [x] **Comandos Inteligentes**: Parser avanzado con validación
- [x] **Multi-perfil**: Soporte para múltiples usuarios
- [x] **Búsqueda Avanzada**: Filtros por estado y prioridad
- [x] **Estadísticas**: Resúmenes detallados de colección
- [x] **Integración API**: Sincronización completa con la web

### Fase 3 - Características Futuras  
- [ ] **Autenticación**: Usuarios con cuentas personales
- [ ] **Sincronización en la Nube**: Respaldo automático
- [ ] **Recomendaciones**: Sistema de sugerencias basado en IA
- [ ] **Lista de Deseos**: Gestión de manga por comprar
- [ ] **Estadísticas Avanzadas**: Dashboards y métricas web
- [ ] **Bot Avanzado**: Notificaciones automáticas y comandos por voz

### Mejoras Técnicas
- [ ] Pruebas unitarias completas
- [ ] Optimización de rendimiento
- [ ] PWA (Progressive Web App)
- [ ] Modo offline
- [ ] Internacionalización (i18n)

## 🐛 Problemas Conocidos

- Las imágenes de Jikan API pueden tener rate limiting
- La compilación de .NET 10 requiere runtime específico en producción
- Algunos gradientes CSS pueden no funcionar en navegadores antiguos

## 📄 Licencia

Este proyecto está bajo la Licencia GNU General Public License v3.0. Ver el archivo `LICENSE` para más detalles.

## 🙏 Agradecimientos

- [Jikan API](https://jikan.moe/) - Datos de manga desde MyAnimeList
- [Angular Material](https://material.angular.io/) - Componentes UI elegantes
- [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/) - ORM robusto
- Comunidad de desarrolladores por las mejores prácticas

## 📞 Contacto y Soporte

- **GitHub Issues**: Para reportar bugs o sugerir features
- **Documentación**: Revisa la carpeta `/docs` para guías detalladas
- **Wiki del Proyecto**: Información técnica adicional

---

**¡Disfruta gestionando tu colección de manga! 📚✨**

*"El conocimiento es poder, pero el manga es vida." - Autor Desconocido*