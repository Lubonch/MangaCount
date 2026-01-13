# MangaCount - Guía Completa de Migración a Angular con Web API

## 📋 Tabla de Contenidos
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Backend - ASP.NET Core Web API](#backend---aspnet-core-web-api)
4. [Frontend - React (a migrar a Angular)](#frontend---react-a-migrar-a-angular)
5. [Base de Datos - SQL Server](#base-de-datos---sql-server)
6. [Funcionalidades Principales](#funcionalidades-principales)
7. [Guía de Implementación Angular](#guía-de-implementación-angular)

---

## Descripción General

**MangaCount** es una aplicación web para gestionar colecciones de manga. Permite a los usuarios crear múltiples perfiles, agregar mangas a su colección, realizar seguimiento de volúmenes, establecer prioridades, y gestionar información sobre editoriales y formatos.

### Tecnologías Actuales
- **Backend**: ASP.NET Core 8.0 Web API
- **Frontend**: React 19.1.0 + Vite
- **Base de Datos**: SQL Server
- **ORM**: Dapper
- **Mapping**: AutoMapper
- **Testing**: Vitest (Frontend)

### Puerto y Configuración
- **Backend**: `https://localhost:7044` (default .NET)
- **Frontend React**: `https://localhost:63920` (Vite dev server)
- **CORS**: Configurado para permitir comunicación entre frontend y backend

---

## Arquitectura del Sistema

### Estructura de Capas

```
MangaCount/
├── MangaCount.Server/              # Backend Web API
│   ├── Controllers/                # API Endpoints
│   ├── Domain/                     # Entidades de dominio
│   ├── DTO/                        # Data Transfer Objects
│   ├── Model/                      # View Models
│   ├── Repositories/               # Acceso a datos (Dapper)
│   │   └── Contracts/              # Interfaces de repositorios
│   ├── Services/                   # Lógica de negocio
│   │   └── Contracts/              # Interfaces de servicios
│   ├── Configs/                    # Configuración y DI
│   ├── Scripts/                    # Scripts SQL
│   └── wwwroot/                    # Archivos estáticos
│       └── profiles/               # Imágenes de perfil
│
├── mangacount.client/              # Frontend React (a migrar)
│   ├── src/
│   │   ├── components/             # Componentes React
│   │   ├── contexts/               # Context API (Theme)
│   │   └── test/                   # Tests unitarios
│   └── public/                     # Assets públicos
│
└── MangaCount.Server.Tests/        # Tests del backend
```

---

## Backend - ASP.NET Core Web API

### 1. Entidades de Dominio

#### **Manga.cs**
```csharp
namespace MangaCount.Server.Domain
{
    public class Manga
    {
        public virtual int Id { get; set; }
        public virtual required string Name { get; set; }
        public virtual int? Volumes { get; set; }
        public virtual int FormatId { get; set; }
        public virtual Format Format { get; set; }
        public virtual int PublisherId { get; set; }
        public virtual Publisher Publisher { get; set; }
    }
}
```

#### **Entry.cs**
```csharp
namespace MangaCount.Server.Domain
{
    public class Entry
    {
        public virtual int Id { get; set; }
        public required Manga Manga { get; set; }
        public virtual required int MangaId { get; set; }
        public virtual required int ProfileId { get; set; }
        public virtual int Quantity { get; set; }
        public virtual string? Pending { get; set; }
        public virtual bool Priority { get; set; }
    }
}
```

#### **Profile.cs**
```csharp
namespace MangaCount.Server.Domain
{
    public class Profile
    {
        public virtual int Id { get; set; }
        public required string Name { get; set; }
        public string? ProfilePicture { get; set; }
        public virtual DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public virtual bool IsActive { get; set; } = true;
    }
}
```

#### **Format.cs**
```csharp
namespace MangaCount.Server.Domain
{
    public class Format
    {
        public int Id { get; set; }
        public required string Name { get; set; }
    }
}
```

#### **Publisher.cs**
```csharp
namespace MangaCount.Server.Domain
{
    public class Publisher
    {
        public int Id { get; set; }
        public required string Name { get; set; }
    }
}
```

### 2. API Controllers

#### **MangaController.cs**
**Ruta base**: `/api/Manga`

**Endpoints**:
- `GET /api/manga` - Obtener todos los mangas
- `GET /api/manga/{id}` - Obtener manga por ID
- `POST /api/manga` - Crear o actualizar manga
- `PUT /api/manga/{id}` - Actualizar manga existente

**Modelo esperado**:
```json
{
  "id": 0,
  "name": "string",
  "volumes": 0,
  "formatId": 1,
  "publisherId": 1
}
```

#### **EntryController.cs**
**Ruta base**: `/api/Entry`

**Endpoints**:
- `GET /api/entry?profileId={id}` - Obtener entradas (opcional: filtrado por perfil)
- `GET /api/entry/{id}` - Obtener entrada por ID
- `POST /api/entry` - Crear o actualizar entrada
- `POST /api/entry/import/{profileId}` - Importar desde archivo TSV
- `GET /api/entry/shared/{profileId1}/{profileId2}` - Obtener manga compartido entre perfiles
- `GET /api/entry/filters/formats?profileId={id}` - Obtener formatos usados
- `GET /api/entry/filters/publishers?profileId={id}` - Obtener editoriales usadas

**Modelo esperado**:
```json
{
  "id": 0,
  "mangaId": 1,
  "profileId": 1,
  "quantity": 5,
  "pending": "Volúmenes 6-10",
  "priority": true
}
```

#### **ProfileController.cs**
**Ruta base**: `/api/Profile`

**Endpoints**:
- `GET /api/profile` - Obtener todos los perfiles
- `GET /api/profile/{id}` - Obtener perfil por ID
- `POST /api/profile` - Crear o actualizar perfil
- `POST /api/profile/upload-picture/{profileId}` - Subir imagen de perfil
- `DELETE /api/profile/{id}` - Eliminar perfil
- `GET /api/profile/image/{fileName}` - Obtener imagen de perfil

**Modelo esperado**:
```json
{
  "id": 0,
  "name": "string",
  "profilePicture": "url",
  "createdDate": "2026-01-13T00:00:00Z",
  "isActive": true
}
```

#### **FormatController.cs**
**Ruta base**: `/api/Format`

**Endpoints**:
- `GET /api/format` - Obtener todos los formatos
- `GET /api/format/{id}` - Obtener formato por ID
- `POST /api/format` - Crear o actualizar formato
- `DELETE /api/format/{id}` - Eliminar formato

#### **PublisherController.cs**
**Ruta base**: `/api/Publisher`

**Endpoints**:
- `GET /api/publisher` - Obtener todas las editoriales
- `GET /api/publisher/{id}` - Obtener editorial por ID
- `POST /api/publisher` - Crear o actualizar editorial
- `DELETE /api/publisher/{id}` - Eliminar editorial

#### **DatabaseController.cs**
**Ruta base**: `/api/Database`

**Endpoints**:
- `POST /api/database/nuke/{profileId}` - Eliminar todos los datos de un perfil
- `POST /api/database/backup` - Crear backup de la base de datos
- `POST /api/database/restore` - Restaurar backup

#### **LoadBearingController.cs**
**Ruta base**: `/api/LoadBearing`

**Endpoints**:
- `GET /api/loadbearing/check` - Verificar que la imagen load-bearing existe
- `GET /api/loadbearing/image` - Obtener la imagen load-bearing

**Nota**: Este es un easter egg. La aplicación requiere un archivo `loadbearingimage.jpg` en la raíz para funcionar.

### 3. Arquitectura de Servicios

#### Inyección de Dependencias (CustomExtensions.cs)
```csharp
public static class CustomExtensions
{
    public static void AddInjectionServices(IServiceCollection services)
    {
        services.AddScoped<IMangaService, MangaService>();
        services.AddScoped<IEntryService, EntryService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IPublisherService, PublisherService>();
        services.AddScoped<IFormatService, FormatService>();
        services.AddScoped<IDatabaseService, DatabaseService>();
    }
    
    public static void AddInjectionRepositories(IServiceCollection services)
    {
        services.AddScoped<IMangaRepository, MangaRepository>();
        services.AddScoped<IEntryRepository, EntryRepository>();
        services.AddScoped<IProfileRepository, ProfileRepository>();
        services.AddScoped<IPublisherRepository, PublisherRepository>();
        services.AddScoped<IFormatRepository, FormatRepository>();
    }
}
```

#### Patrón Repositorio
Todos los repositorios implementan operaciones CRUD usando **Dapper**:
- `Create(T entity)` - Insertar nuevo registro
- `Update(T entity)` - Actualizar registro existente
- `GetById(int id)` - Obtener por ID
- `GetAll()` - Obtener todos los registros
- Métodos específicos según entidad

**Ejemplo de MangaRepository**:
```csharp
public Manga Create(Manga manga)
{
    var sql = @"INSERT INTO [dbo].[Manga]
                ([Name],[Volumes],[FormatId],[PublisherId])
                VALUES(@Name,@Volumes,@FormatId,@PublisherId); 
                SELECT CAST(SCOPE_IDENTITY() as int);";
    
    using (var connection = new SqlConnection(connString))
    {
        connection.Open();
        var newId = connection.QuerySingle<int>(sql, parameters);
        manga.Id = newId;
        return manga;
    }
}
```

### 4. Configuración (Program.cs)

```csharp
var builder = WebApplication.CreateBuilder(args);

// Verificar imagen load-bearing
var loadBearingImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
if (!File.Exists(loadBearingImagePath))
{
    throw new FileNotFoundException("Ah, I wouldn't take it down if I were you. It's a load-bearing image.", "loadbearingimage.jpg");
}

builder.Services.AddControllers();

// CORS para React (cambiar para Angular)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("https://localhost:63920")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

CustomExtensions.AddInjectionServices(builder.Services);
CustomExtensions.AddInjectionRepositories(builder.Services);

var app = builder.Build();

app.UseCors("AllowReactApp");
app.UseStaticFiles();

// Crear directorio para imágenes de perfil
var profilesPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "profiles");
if (!Directory.Exists(profilesPath))
{
    Directory.CreateDirectory(profilesPath);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();
```

### 5. Configuración de Base de Datos

**appsettings.json**:
```json
{
  "ConnectionStrings": {
    "MangacountDatabase": "Server=localhost;Database=MangaCount;TrustServerCertificate=True;Trusted_Connection=False;Integrated Security=true;"
  },
  "paths": {
    "projectpath": "C:\\repos\\"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    },
    "LogsFolder": ".\\Logs",
    "LogInstance": "DefaultInstance"
  },
  "AllowedHosts": "*"
}
```

### 6. Paquetes NuGet Requeridos

**MangaCount.Server.csproj**:
```xml
<PackageReference Include="AutoMapper" Version="15.0.1" />
<PackageReference Include="Dapper" Version="2.1.66" />
<PackageReference Include="Microsoft.AspNetCore.SpaProxy" Version="8.*-*" />
<PackageReference Include="Microsoft.Data.SqlClient" Version="6.0.2" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
```

---

## Base de Datos - SQL Server

### Esquema de Base de Datos

#### Tabla: Profiles
```sql
CREATE TABLE [dbo].[Profiles] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL,
    [ProfilePicture] nvarchar(500) NULL,
    [CreatedDate] datetime2 NOT NULL DEFAULT GETUTCDATE(),
    [IsActive] bit NOT NULL DEFAULT 1
);
```

#### Tabla: Formats
```sql
CREATE TABLE [dbo].[Formats] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL
);
```

#### Tabla: Publishers
```sql
CREATE TABLE [dbo].[Publishers] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL
);
```

#### Tabla: Manga
```sql
CREATE TABLE [dbo].[Manga] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] nvarchar(255) NOT NULL,
    [Volumes] int NULL,
    [FormatId] int NOT NULL DEFAULT 1,
    [PublisherId] int NOT NULL DEFAULT 1,
    CONSTRAINT [FK_Manga_Formats] FOREIGN KEY ([FormatId]) 
        REFERENCES [dbo].[Formats]([Id]),
    CONSTRAINT [FK_Manga_Publishers] FOREIGN KEY ([PublisherId]) 
        REFERENCES [dbo].[Publishers]([Id])
);
```

#### Tabla: Entry
```sql
CREATE TABLE [dbo].[Entry] (
    [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [MangaId] int NOT NULL,
    [ProfileId] int NOT NULL,
    [Quantity] int NOT NULL DEFAULT 0,
    [Pending] nvarchar(500) NULL,
    [Priority] bit NOT NULL DEFAULT 0,
    CONSTRAINT [FK_Entry_Manga] FOREIGN KEY ([MangaId]) 
        REFERENCES [dbo].[Manga]([Id]),
    CONSTRAINT [FK_Entry_Profile] FOREIGN KEY ([ProfileId]) 
        REFERENCES [dbo].[Profiles]([Id])
);
```

### Datos Iniciales
```sql
-- Formato y editorial por defecto
INSERT INTO [dbo].[Formats] ([Name]) VALUES ('Unknown');
INSERT INTO [dbo].[Publishers] ([Name]) VALUES ('Unknown');
```

---

## Frontend - React (a migrar a Angular)

### 1. Estructura de Componentes

#### **App.jsx** (Componente Principal)
**Responsabilidades**:
- Gestión de estado global de la aplicación
- Flujo de navegación entre selección de perfil y colección
- Carga inicial de datos (perfiles, mangas, entradas)
- Manejo de cambio de perfil
- Provider del ThemeContext

**Estados principales**:
```javascript
const [entries, setEntries] = useState([]);          // Entradas del perfil actual
const [mangas, setMangas] = useState([]);            // Catálogo de mangas
const [profiles, setProfiles] = useState([]);        // Lista de perfiles
const [selectedProfile, setSelectedProfile] = useState(null);  // Perfil activo
const [loading, setLoading] = useState(true);        // Estado de carga
const [appPhase, setAppPhase] = useState('loading'); // Fase de la app
```

**Fases de la aplicación**:
- `loading`: Cargando datos iniciales
- `profile-selection`: Seleccionando perfil
- `main-app`: Vista principal de colección
- `error`: Error en carga

**Funciones principales**:
```javascript
initializeApp()                    // Inicializa la aplicación
loadProfiles()                     // Carga lista de perfiles
loadData(isRefresh)                // Carga datos del perfil
loadEntries(profileId)             // Carga entradas del perfil
loadMangas()                       // Carga catálogo de mangas
handleProfileSelect(profile)       // Selecciona un perfil
handleBackToProfileSelection()     // Vuelve a selección de perfil
handleImportSuccess()              // Callback de importación exitosa
```

#### **ProfileSelector.jsx**
**Responsabilidades**:
- Mostrar lista de perfiles disponibles
- Crear nuevos perfiles
- Subir imágenes de perfil
- Eliminar perfiles

**Props**:
```javascript
{
  onProfileSelect: (profile) => void,
  selectedProfileId: number,
  isChangingProfile: boolean,
  showBackButton: boolean,
  onBackToMain: () => void,
  lastSelectedProfile: Profile
}
```

**Funcionalidades**:
- Crear perfil con nombre y foto opcional
- Grid de perfiles con avatares
- Highlighting del último perfil usado
- Validación de nombre único

#### **CollectionView.jsx**
**Responsabilidades**:
- Mostrar colección de mangas del perfil
- Filtros múltiples (estado, editorial, formato)
- Ordenamiento (nombre, cantidad, completitud, prioridad)
- Modos de vista (cards/table)
- Edición rápida de cantidad de volúmenes
- Edición de entradas y mangas

**Filtros disponibles**:
- `all`: Todos
- `complete`: Completos (cantidad >= volúmenes totales)
- `incomplete`: Incompletos sin prioridad
- `priority-incomplete`: Incompletos con prioridad
- `priority`: Todos los prioritarios
- `pending`: Con volúmenes pendientes anotados
- Por editorial (dinámico)
- Por formato (dinámico)

**Ordenamiento**:
- Por nombre
- Por cantidad de volúmenes
- Por porcentaje de completitud
- Por prioridad
- Por editorial
- Por formato

**Funciones principales**:
```javascript
getFilteredEntries()               // Aplica todos los filtros
getEntryStatus(entry)              // Determina estado de una entrada
getCompletionPercentage(entry)     // Calcula porcentaje completado
handleQuickVolumeUpdate()          // Actualiza cantidad sin modal
handleEditEntry()                  // Abre modal de edición de entrada
handleEditManga()                  // Abre modal de edición de manga
loadFilterOptions()                // Carga opciones de filtro dinámicas
```

#### **Sidebar.jsx**
**Responsabilidades**:
- Acciones rápidas (agregar entrada/manga)
- Importar colección desde TSV
- Cambiar tema (claro/oscuro)
- Volver a selección de perfil
- Mostrar perfil actual
- Eliminar datos del perfil (nuke)

**Props**:
```javascript
{
  mangas: Manga[],
  selectedProfile: Profile,
  onImportSuccess: () => void,
  onBackToProfiles: () => void,
  refreshing: boolean
}
```

**Funcionalidades**:
- Importación de archivo TSV
- Botones de acción para agregar contenido
- Toggle de tema
- Botón de "nuke" para borrar datos

#### **AddEntryModal.jsx**
**Responsabilidades**:
- Modal para agregar/editar entradas
- Selección de manga existente o creación de nuevo
- Campos: manga, cantidad, pendientes, prioridad

**Props**:
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  onSuccess: () => void,
  mangas: Manga[],
  selectedProfile: Profile,
  editingEntry?: Entry  // Opcional para edición
}
```

**Validaciones**:
- Manga seleccionado
- Cantidad >= 0
- Auto-creación de manga si no existe

#### **AddMangaModal.jsx**
**Responsabilidades**:
- Modal para agregar/editar mangas
- Campos: nombre, volúmenes, formato, editorial
- Gestión de formatos y editoriales

**Props**:
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  onSuccess: () => void,
  editingManga?: Manga  // Opcional para edición
}
```

**Funcionalidades**:
- CRUD de formatos
- CRUD de editoriales
- Validación de nombre único
- Volúmenes opcionales (para series en curso)

#### **NukeDataModal.jsx**
**Responsabilidades**:
- Modal de confirmación para eliminar todos los datos de un perfil
- Requiere confirmación escribiendo "DELETE"

**Props**:
```javascript
{
  isOpen: boolean,
  onClose: () => void,
  onSuccess: () => void,
  profileId: number
}
```

#### **ThemeToggle.jsx** y **ThemeContext.jsx**
**Responsabilidades**:
- Gestión de tema claro/oscuro
- Persistencia en localStorage
- Toggle visual con íconos

**Context API**:
```javascript
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {}
});
```

#### **LoadBearingCheck.jsx**
**Responsabilidades**:
- Verificar la existencia de la imagen load-bearing
- Mostrar error si no existe
- Easter egg de la aplicación

#### **LoadingSpinner.jsx**
**Responsabilidades**:
- Spinner de carga reutilizable
- Tamaños: small, medium, large
- Modo fullscreen opcional

### 2. Flujo de Datos

```
App (Estado Global)
├── ProfileSelector (selección)
│   └── Fetch: /api/profile
│       └── Post: /api/profile (crear)
│       └── Post: /api/profile/upload-picture/{id}
│       └── Delete: /api/profile/{id}
│
├── Sidebar (acciones)
│   ├── AddEntryModal
│   │   └── Post: /api/entry
│   ├── AddMangaModal
│   │   └── Post: /api/manga
│   │   └── Get/Post: /api/format
│   │   └── Get/Post: /api/publisher
│   ├── Import TSV
│   │   └── Post: /api/entry/import/{profileId}
│   └── NukeDataModal
│       └── Post: /api/database/nuke/{profileId}
│
└── CollectionView (visualización)
    ├── Fetch: /api/entry?profileId={id}
    ├── Fetch: /api/entry/filters/formats?profileId={id}
    ├── Fetch: /api/entry/filters/publishers?profileId={id}
    └── Quick Update: Post /api/entry
```

### 3. Estilos y Temas

**Sistema de temas**:
```css
:root {
  /* Light theme */
  --bg-color: #f5f5f5;
  --surface-color: white;
  --text-color: #333;
  --primary-color: #4a90e2;
  --border-color: #ddd;
}

[data-theme='dark'] {
  /* Dark theme */
  --bg-color: #1a1a1a;
  --surface-color: #2d2d2d;
  --text-color: #e0e0e0;
  --primary-color: #5fa3e7;
  --border-color: #444;
}
```

**Componentes estilizados**:
- Cards con sombras y hover effects
- Modales con overlay
- Formularios responsivos
- Grid layout para perfiles y colecciones
- Botones con estados (hover, active, disabled)

### 4. Testing

**Herramientas**:
- Vitest para testing
- Testing Library para componentes React
- jsdom para DOM virtual

**Archivos de test**:
- `App.test.jsx`
- `ProfileSelector.test.jsx`
- `Sidebar.test.jsx`
- `simple.test.jsx`

---

## Funcionalidades Principales

### 1. Gestión de Perfiles
- ✅ Crear perfiles con nombre y foto
- ✅ Seleccionar perfil activo
- ✅ Cambiar entre perfiles
- ✅ Eliminar perfiles
- ✅ Persistir último perfil seleccionado (localStorage)
- ✅ Auto-selección si solo hay un perfil

### 2. Gestión de Mangas
- ✅ Agregar mangas al catálogo
- ✅ Editar información de manga
- ✅ Asociar formato y editorial
- ✅ Especificar número total de volúmenes (opcional)
- ✅ Ver catálogo completo

### 3. Gestión de Colección
- ✅ Agregar manga a colección personal
- ✅ Registrar cantidad de volúmenes poseídos
- ✅ Marcar como prioritario
- ✅ Anotar volúmenes pendientes
- ✅ Actualización rápida de cantidad
- ✅ Editar entradas existentes

### 4. Filtros y Búsqueda
- ✅ Filtrar por estado (completo/incompleto/prioritario)
- ✅ Filtrar por editorial
- ✅ Filtrar por formato
- ✅ Combinar múltiples filtros
- ✅ Ordenar por múltiples criterios

### 5. Importación/Exportación
- ✅ Importar colección desde TSV
- ✅ Procesamiento batch de entradas
- ✅ Validación de formato

### 6. Visualización
- ✅ Vista de tarjetas (cards)
- ✅ Vista de tabla
- ✅ Indicadores visuales de completitud
- ✅ Barra de progreso por entrada
- ✅ Badges de estado

### 7. Gestión de Datos
- ✅ Backup de base de datos
- ✅ Restauración de backup
- ✅ Eliminación completa de datos de perfil
- ✅ Confirmación de acciones destructivas

### 8. Temas
- ✅ Tema claro/oscuro
- ✅ Persistencia de preferencia
- ✅ Aplicación global

---

## Guía de Implementación Angular

### 1. Configuración Inicial

#### Crear Proyecto Angular
```bash
ng new mangacount-angular --routing --style=scss
cd mangacount-angular
```

#### Instalar Dependencias
```bash
npm install @angular/material @angular/cdk
npm install @angular/common/http
npm install ngx-file-drop  # Para drag & drop de archivos
```

### 2. Estructura de Proyecto Angular

```
src/
├── app/
│   ├── core/                          # Servicios singleton
│   │   ├── services/
│   │   │   ├── api.service.ts         # Servicio base HTTP
│   │   │   ├── manga.service.ts
│   │   │   ├── entry.service.ts
│   │   │   ├── profile.service.ts
│   │   │   ├── format.service.ts
│   │   │   ├── publisher.service.ts
│   │   │   └── theme.service.ts
│   │   ├── guards/
│   │   │   └── profile-selected.guard.ts
│   │   └── interceptors/
│   │       └── api.interceptor.ts
│   │
│   ├── shared/                        # Componentes compartidos
│   │   ├── components/
│   │   │   ├── loading-spinner/
│   │   │   ├── confirm-dialog/
│   │   │   └── theme-toggle/
│   │   ├── pipes/
│   │   │   └── completion-percentage.pipe.ts
│   │   └── directives/
│   │
│   ├── features/                      # Módulos de funcionalidad
│   │   ├── profile/
│   │   │   ├── profile-selection/
│   │   │   ├── profile-create/
│   │   │   └── profile.module.ts
│   │   │
│   │   ├── collection/
│   │   │   ├── collection-view/
│   │   │   ├── entry-card/
│   │   │   ├── entry-table/
│   │   │   ├── filters/
│   │   │   └── collection.module.ts
│   │   │
│   │   ├── sidebar/
│   │   │   ├── sidebar.component.ts
│   │   │   ├── add-entry-modal/
│   │   │   ├── add-manga-modal/
│   │   │   ├── nuke-modal/
│   │   │   └── sidebar.module.ts
│   │   │
│   │   └── manga/
│   │       ├── manga-form/
│   │       └── manga.module.ts
│   │
│   ├── models/                        # Interfaces TypeScript
│   │   ├── manga.model.ts
│   │   ├── entry.model.ts
│   │   ├── profile.model.ts
│   │   ├── format.model.ts
│   │   └── publisher.model.ts
│   │
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.component.scss
│   ├── app.routes.ts
│   └── app.config.ts
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
└── styles/
    ├── _variables.scss
    ├── _themes.scss
    └── styles.scss
```

### 3. Modelos TypeScript

#### **manga.model.ts**
```typescript
export interface Manga {
  id: number;
  name: string;
  volumes: number | null;
  formatId: number;
  format?: Format;
  publisherId: number;
  publisher?: Publisher;
}

export interface MangaCreateDto {
  id?: number;
  name: string;
  volumes: number | null;
  formatId: number;
  publisherId: number;
}
```

#### **entry.model.ts**
```typescript
export interface Entry {
  id: number;
  mangaId: number;
  manga: Manga;
  profileId: number;
  quantity: number;
  pending: string | null;
  priority: boolean;
}

export interface EntryCreateDto {
  id?: number;
  mangaId: number;
  profileId: number;
  quantity: number;
  pending?: string;
  priority: boolean;
}
```

#### **profile.model.ts**
```typescript
export interface Profile {
  id: number;
  name: string;
  profilePicture: string | null;
  createdDate: Date;
  isActive: boolean;
}

export interface ProfileCreateDto {
  id?: number;
  name: string;
  profilePicture?: string;
}
```

#### **format.model.ts** & **publisher.model.ts**
```typescript
export interface Format {
  id: number;
  name: string;
}

export interface Publisher {
  id: number;
  name: string;
}
```

### 4. Servicios Angular

#### **api.service.ts** (Base Service)
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: any): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params });
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body);
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
  }

  uploadFile<T>(endpoint: string, file: File): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, formData);
  }
}
```

#### **profile.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Profile, ProfileCreateDto } from '../models/profile.model';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private selectedProfileSubject = new BehaviorSubject<Profile | null>(null);
  public selectedProfile$ = this.selectedProfileSubject.asObservable();

  constructor(private api: ApiService) {
    this.loadSelectedProfileFromStorage();
  }

  getAllProfiles(): Observable<Profile[]> {
    return this.api.get<Profile[]>('/api/profile');
  }

  getProfileById(id: number): Observable<Profile> {
    return this.api.get<Profile>(`/api/profile/${id}`);
  }

  createOrUpdateProfile(profile: ProfileCreateDto): Observable<any> {
    return this.api.post('/api/profile', profile);
  }

  uploadProfilePicture(profileId: number, file: File): Observable<any> {
    return this.api.uploadFile(`/api/profile/upload-picture/${profileId}`, file);
  }

  deleteProfile(id: number): Observable<any> {
    return this.api.delete(`/api/profile/${id}`);
  }

  selectProfile(profile: Profile): void {
    this.selectedProfileSubject.next(profile);
    localStorage.setItem('selectedProfileId', profile.id.toString());
  }

  clearSelectedProfile(): void {
    this.selectedProfileSubject.next(null);
    localStorage.removeItem('selectedProfileId');
  }

  private loadSelectedProfileFromStorage(): void {
    const profileId = localStorage.getItem('selectedProfileId');
    if (profileId) {
      this.getProfileById(parseInt(profileId)).subscribe(
        profile => this.selectedProfileSubject.next(profile),
        error => console.error('Failed to load saved profile', error)
      );
    }
  }
}
```

#### **entry.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Entry, EntryCreateDto } from '../models/entry.model';

@Injectable({
  providedIn: 'root'
})
export class EntryService {
  constructor(private api: ApiService) {}

  getAllEntries(profileId?: number): Observable<Entry[]> {
    const params = profileId ? { profileId: profileId.toString() } : {};
    return this.api.get<Entry[]>('/api/entry', params);
  }

  getEntryById(id: number): Observable<Entry> {
    return this.api.get<Entry>(`/api/entry/${id}`);
  }

  createOrUpdateEntry(entry: EntryCreateDto): Observable<any> {
    return this.api.post('/api/entry', entry);
  }

  importFromFile(profileId: number, file: File): Observable<any> {
    return this.api.uploadFile(`/api/entry/import/${profileId}`, file);
  }

  getSharedManga(profileId1: number, profileId2: number): Observable<any[]> {
    return this.api.get(`/api/entry/shared/${profileId1}/${profileId2}`);
  }

  getUsedFormats(profileId?: number): Observable<any[]> {
    const params = profileId ? { profileId: profileId.toString() } : {};
    return this.api.get('/api/entry/filters/formats', params);
  }

  getUsedPublishers(profileId?: number): Observable<any[]> {
    const params = profileId ? { profileId: profileId.toString() } : {};
    return this.api.get('/api/entry/filters/publishers', params);
  }
}
```

#### **manga.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Manga, MangaCreateDto } from '../models/manga.model';

@Injectable({
  providedIn: 'root'
})
export class MangaService {
  constructor(private api: ApiService) {}

  getAllMangas(): Observable<Manga[]> {
    return this.api.get<Manga[]>('/api/manga');
  }

  getMangaById(id: number): Observable<Manga> {
    return this.api.get<Manga>(`/api/manga/${id}`);
  }

  createOrUpdateManga(manga: MangaCreateDto): Observable<any> {
    if (manga.id && manga.id > 0) {
      return this.api.put(`/api/manga/${manga.id}`, manga);
    }
    return this.api.post('/api/manga', manga);
  }
}
```

#### **theme.service.ts**
```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>('light');
  public theme$ = this.themeSubject.asObservable();

  constructor() {
    this.loadThemeFromStorage();
  }

  toggleTheme(): void {
    const newTheme: Theme = this.themeSubject.value === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  private loadThemeFromStorage(): void {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      this.setTheme(savedTheme);
    }
  }
}
```

### 5. Componentes Principales Angular

#### **app.component.ts**
```typescript
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from './core/services/profile.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  constructor(
    private profileService: ProfileService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialization logic
    this.profileService.selectedProfile$.subscribe(profile => {
      if (profile) {
        this.router.navigate(['/collection']);
      } else {
        this.router.navigate(['/profiles']);
      }
    });
  }
}
```

#### **Routes (app.routes.ts)**
```typescript
import { Routes } from '@angular/router';
import { ProfileSelectedGuard } from './core/guards/profile-selected.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/profiles',
    pathMatch: 'full'
  },
  {
    path: 'profiles',
    loadComponent: () => import('./features/profile/profile-selection/profile-selection.component')
      .then(m => m.ProfileSelectionComponent)
  },
  {
    path: 'collection',
    loadComponent: () => import('./features/collection/collection-view/collection-view.component')
      .then(m => m.CollectionViewComponent),
    canActivate: [ProfileSelectedGuard]
  },
  {
    path: '**',
    redirectTo: '/profiles'
  }
];
```

#### **profile-selection.component.ts**
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { Profile, ProfileCreateDto } from '../../../models/profile.model';

@Component({
  selector: 'app-profile-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-selection.component.html',
  styleUrls: ['./profile-selection.component.scss']
})
export class ProfileSelectionComponent implements OnInit {
  profiles: Profile[] = [];
  showCreateModal = false;
  newProfile: ProfileCreateDto = { name: '' };
  selectedFile: File | null = null;
  loading = true;

  constructor(
    private profileService: ProfileService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.profileService.getAllProfiles().subscribe({
      next: (profiles) => {
        this.profiles = profiles;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profiles', error);
        this.loading = false;
      }
    });
  }

  selectProfile(profile: Profile): void {
    this.profileService.selectProfile(profile);
    this.router.navigate(['/collection']);
  }

  createProfile(): void {
    this.profileService.createOrUpdateProfile(this.newProfile).subscribe({
      next: (response) => {
        if (this.selectedFile) {
          // Upload picture if selected
          this.profileService.uploadProfilePicture(response.id, this.selectedFile).subscribe();
        }
        this.loadProfiles();
        this.closeCreateModal();
      },
      error: (error) => console.error('Error creating profile', error)
    });
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.newProfile = { name: '' };
    this.selectedFile = null;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  deleteProfile(profile: Profile, event: Event): void {
    event.stopPropagation();
    if (confirm(`¿Eliminar perfil "${profile.name}"?`)) {
      this.profileService.deleteProfile(profile.id).subscribe({
        next: () => this.loadProfiles(),
        error: (error) => console.error('Error deleting profile', error)
      });
    }
  }
}
```

#### **collection-view.component.ts**
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../../core/services/profile.service';
import { EntryService } from '../../../core/services/entry.service';
import { MangaService } from '../../../core/services/manga.service';
import { Entry } from '../../../models/entry.model';
import { Manga } from '../../../models/manga.model';
import { Profile } from '../../../models/profile.model';

@Component({
  selector: 'app-collection-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './collection-view.component.html',
  styleUrls: ['./collection-view.component.scss']
})
export class CollectionViewComponent implements OnInit {
  entries: Entry[] = [];
  mangas: Manga[] = [];
  selectedProfile: Profile | null = null;
  loading = true;
  
  // Filters
  filterStatus = 'all';
  filterPublisher = 'all';
  filterFormat = 'all';
  sortBy = 'name';
  viewMode: 'cards' | 'table' = 'cards';

  // Filter options
  availablePublishers: any[] = [];
  availableFormats: any[] = [];

  constructor(
    private profileService: ProfileService,
    private entryService: EntryService,
    private mangaService: MangaService
  ) {}

  ngOnInit(): void {
    this.profileService.selectedProfile$.subscribe(profile => {
      this.selectedProfile = profile;
      if (profile) {
        this.loadData();
      }
    });
  }

  loadData(): void {
    if (!this.selectedProfile) return;

    this.loading = true;
    
    // Load entries
    this.entryService.getAllEntries(this.selectedProfile.id).subscribe({
      next: (entries) => {
        this.entries = entries;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading entries', error);
        this.loading = false;
      }
    });

    // Load mangas
    this.mangaService.getAllMangas().subscribe({
      next: (mangas) => this.mangas = mangas,
      error: (error) => console.error('Error loading mangas', error)
    });

    // Load filter options
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    if (!this.selectedProfile) return;

    this.entryService.getUsedFormats(this.selectedProfile.id).subscribe({
      next: (formats) => this.availableFormats = formats,
      error: (error) => console.error('Error loading formats', error)
    });

    this.entryService.getUsedPublishers(this.selectedProfile.id).subscribe({
      next: (publishers) => this.availablePublishers = publishers,
      error: (error) => console.error('Error loading publishers', error)
    });
  }

  get filteredAndSortedEntries(): Entry[] {
    let filtered = this.entries.filter(entry => {
      // Status filter
      if (this.filterStatus !== 'all') {
        const status = this.getEntryStatus(entry);
        if (status !== this.filterStatus) return false;
      }

      // Publisher filter
      if (this.filterPublisher !== 'all') {
        if (entry.manga.publisherId !== parseInt(this.filterPublisher)) return false;
      }

      // Format filter
      if (this.filterFormat !== 'all') {
        if (entry.manga.formatId !== parseInt(this.filterFormat)) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'name':
          return a.manga.name.localeCompare(b.manga.name);
        case 'quantity':
          return b.quantity - a.quantity;
        case 'completion':
          const aPercent = this.getCompletionPercentage(a) || 0;
          const bPercent = this.getCompletionPercentage(b) || 0;
          return bPercent - aPercent;
        default:
          return 0;
      }
    });

    return filtered;
  }

  getEntryStatus(entry: Entry): string {
    const isComplete = entry.manga.volumes && entry.quantity >= entry.manga.volumes;
    if (isComplete) return 'complete';
    if (entry.priority) return 'priority-incomplete';
    return 'incomplete';
  }

  getCompletionPercentage(entry: Entry): number | null {
    if (!entry.manga.volumes || entry.manga.volumes === 0) return null;
    return Math.round((entry.quantity / entry.manga.volumes) * 100);
  }

  updateQuantity(entry: Entry, newQuantity: number): void {
    const updatedEntry = { ...entry, quantity: newQuantity };
    this.entryService.createOrUpdateEntry(updatedEntry).subscribe({
      next: () => this.loadData(),
      error: (error) => console.error('Error updating entry', error)
    });
  }
}
```

### 6. Guard para Protección de Rutas

#### **profile-selected.guard.ts**
```typescript
import { Injectable } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { ProfileService } from '../services/profile.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfileSelectedGuard implements CanActivate {
  constructor(
    private profileService: ProfileService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.profileService.selectedProfile$.pipe(
      take(1),
      map(profile => {
        if (profile) {
          return true;
        } else {
          this.router.navigate(['/profiles']);
          return false;
        }
      })
    );
  }
}
```

### 7. Environment Configuration

#### **environment.ts**
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://localhost:7044'
};
```

#### **environment.prod.ts**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-api.com'
};
```

### 8. CORS Configuration para Angular

Actualizar **Program.cs** en el backend:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:4200")  // Puerto de ng serve
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// ...

app.UseCors("AllowAngularApp");
```

### 9. Pipes Personalizados

#### **completion-percentage.pipe.ts**
```typescript
import { Pipe, PipeTransform } from '@angular/core';
import { Entry } from '../models/entry.model';

@Pipe({
  name: 'completionPercentage',
  standalone: true
})
export class CompletionPercentagePipe implements PipeTransform {
  transform(entry: Entry): number | null {
    if (!entry.manga.volumes || entry.manga.volumes === 0) {
      return null;
    }
    return Math.round((entry.quantity / entry.manga.volumes) * 100);
  }
}
```

### 10. Estilos SCSS

#### **_themes.scss**
```scss
:root {
  --bg-color: #f5f5f5;
  --surface-color: white;
  --text-color: #333;
  --text-secondary: #666;
  --primary-color: #4a90e2;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --danger-color: #f44336;
  --border-color: #ddd;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] {
  --bg-color: #1a1a1a;
  --surface-color: #2d2d2d;
  --text-color: #e0e0e0;
  --text-secondary: #aaa;
  --primary-color: #5fa3e7;
  --success-color: #66bb6a;
  --warning-color: #ffa726;
  --danger-color: #ef5350;
  --border-color: #444;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

### 11. Testing en Angular

#### Configuración de Jasmine/Karma
```typescript
// entry.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EntryService } from './entry.service';
import { Entry } from '../models/entry.model';

describe('EntryService', () => {
  let service: EntryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EntryService]
    });
    service = TestBed.inject(EntryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should retrieve all entries', () => {
    const mockEntries: Entry[] = [
      { id: 1, mangaId: 1, profileId: 1, quantity: 5, pending: null, priority: false, manga: {} as any }
    ];

    service.getAllEntries(1).subscribe(entries => {
      expect(entries.length).toBe(1);
      expect(entries).toEqual(mockEntries);
    });

    const req = httpMock.expectOne('/api/entry?profileId=1');
    expect(req.request.method).toBe('GET');
    req.flush(mockEntries);
  });
});
```

### 12. Mejoras Adicionales para Angular

#### Directivas Personalizadas
```typescript
// drag-drop.directive.ts
import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appDragDrop]',
  standalone: true
})
export class DragDropDirective {
  @Output() fileDropped = new EventEmitter<FileList>();

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files) {
      this.fileDropped.emit(files);
    }
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }
}
```

#### State Management (opcional - NgRx)
Si la aplicación crece, considera implementar NgRx para gestión de estado:
```typescript
// app.state.ts
export interface AppState {
  profiles: ProfileState;
  entries: EntryState;
  mangas: MangaState;
}

export interface ProfileState {
  profiles: Profile[];
  selectedProfile: Profile | null;
  loading: boolean;
}

// actions, reducers, effects...
```

### 13. Build y Deployment

#### Angular Build
```bash
ng build --configuration production
```

#### Integración con .NET
Actualizar **MangaCount.Server.csproj**:
```xml
<PropertyGroup>
  <SpaRoot>..\mangacount-angular</SpaRoot>
  <SpaProxyServerUrl>http://localhost:4200</SpaProxyServerUrl>
  <SpaProxyLaunchCommand>npm start</SpaProxyLaunchCommand>
</PropertyGroup>

<ItemGroup>
  <ProjectReference Include="..\mangacount-angular\mangacount-angular.esproj">
    <ReferenceOutputAssembly>false</ReferenceOutputAssembly>
  </ProjectReference>
</ItemGroup>
```

---

## Checklist de Migración

### Backend (Sin cambios mayores)
- [ ] Actualizar CORS para Angular (puerto 4200)
- [ ] Verificar que todos los endpoints funcionan
- [ ] Asegurar que Swagger está disponible para testing
- [ ] Confirmar conexión a base de datos

### Frontend Angular
- [ ] Crear proyecto Angular con routing
- [ ] Instalar Angular Material
- [ ] Crear modelos TypeScript para todas las entidades
- [ ] Implementar servicios para cada endpoint
- [ ] Crear componente de selección de perfil
- [ ] Crear componente de vista de colección
- [ ] Crear componente de sidebar
- [ ] Implementar modales (agregar entrada, manga, nuke)
- [ ] Implementar sistema de temas
- [ ] Configurar routing y guards
- [ ] Implementar filtros y ordenamiento
- [ ] Implementar importación TSV
- [ ] Añadir loading spinners y estados de carga
- [ ] Implementar manejo de errores
- [ ] Crear pipes personalizados
- [ ] Estilizar con SCSS (replicar diseño React)
- [ ] Testing unitario de servicios
- [ ] Testing de componentes
- [ ] Testing E2E (opcional)
- [ ] Build de producción
- [ ] Integración con backend .NET

### Base de Datos
- [ ] No requiere cambios

### Documentación
- [ ] Actualizar README del proyecto
- [ ] Documentar nuevos componentes Angular
- [ ] Guía de desarrollo para nuevos features

---

## Notas Finales

### Diferencias Clave React vs Angular
1. **State Management**: React usa hooks (useState, useEffect), Angular usa RxJS Observables
2. **Routing**: React Router vs Angular Router
3. **Forms**: Formularios no controlados/controlados en React vs Reactive Forms/Template-driven en Angular
4. **HTTP**: fetch/axios en React vs HttpClient en Angular
5. **Dependency Injection**: Context API/Props en React vs DI nativo en Angular
6. **Styling**: CSS Modules/styled-components en React vs ViewEncapsulation en Angular

### Ventajas de Angular para esta Aplicación
- TypeScript nativo con tipado fuerte
- Dependency Injection out-of-the-box
- RxJS para manejo reactivo de datos
- Estructura más opinionada y escalable
- Material Design components incluidos
- Mejor integración con backends .NET

### Load-Bearing Image
**IMPORTANTE**: No olvidar incluir el archivo `loadbearingimage.jpg` en la raíz del proyecto backend. La aplicación NO funcionará sin él (es un easter egg intencional).

---

## Conclusión

Esta guía proporciona todos los detalles necesarios para recrear MangaCount en Angular manteniendo el backend Web API existente. La arquitectura está diseñada para ser escalable, mantenible y seguir las mejores prácticas de Angular.

**Puntos clave**:
- El backend NO requiere cambios (solo CORS)
- Toda la lógica de negocio permanece en el backend
- Angular se comunica vía HTTP API
- La estructura modular facilita el mantenimiento
- Testing incluido desde el inicio
- Sistema de temas implementado
- Guards protegen rutas
- Servicios manejan estado global con RxJS

**Tiempo estimado de migración**: 40-60 horas de desarrollo
