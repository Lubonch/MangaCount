# 📖 MANUAL DE USUARIO - MANGA COUNT
## Documentación de Funcionalidad Actual (Baseline)

Este documento describe exactamente cómo funciona el sistema **ANTES** de la migración hexagonal, para poder validar que la migración preserva toda la funcionalidad.

---

## 🎯 **FUNCIONALIDAD CORE**

### **1. Gestión de Perfiles**
- **Acceso**: No requiere login/registro
- **Perfiles**: Múltiples perfiles locales en la misma aplicación
- **Cambio**: Switch entre perfiles sin perder datos
- **Almacenamiento**: Perfiles guardados localmente

### **2. CRUD de Manga**
- **Crear Manga**: Formulario con campos: Título, Autor, Editorial, Formato, etc.
- **Listar Manga**: Vista de colección completa con filtros
- **Editar Manga**: Modificar información existente
- **Eliminar Manga**: Borrado con confirmación
- **Búsqueda**: Por título, autor, editorial

### **3. Seguimiento de Lectura (Entries)**
- **Agregar Entry**: Vincular manga con perfil de usuario
- **Estados**: Leyendo, Completado, Pausado, Abandonado
- **Progreso**: Volúmenes leídos vs total
- **Notas**: Comentarios personales por entry

### **4. Publishers y Formats**
- **CRUD Publishers**: Gestión de editoriales
- **CRUD Formats**: Gestión de formatos (Tankobon, Bunko, etc.)
- **Relaciones**: Manga pertenece a Publisher y Format

### **5. Import/Export TSV**
- **Formato**: Archivo TSV con columnas específicas
- **Campos**: Título, Autor, Publisher, Format, Volúmenes, etc.
- **Validación**: Verificación de datos antes de importar
- **Manejo de errores**: Reporte de filas con problemas

### **6. Subida de Imágenes de Perfil**
- **Formatos**: JPG, PNG
- **Tamaño**: Límite de tamaño definido
- **Almacenamiento**: Sistema de archivos local
- **Fallback**: Imagen por defecto si no hay foto

### **7. Comparación de Colecciones**
- **Selección**: Elegir dos perfiles para comparar
- **Vista**: Mangas en común, diferencias
- **Estadísticas**: Porcentajes de coincidencia

### **8. Lookup ISBN (OpenLibrary API)**
- **Búsqueda**: Por código ISBN
- **API**: Integración con OpenLibrary
- **Autocompletado**: Rellenar campos automáticamente
- **Fallback**: Búsqueda manual si API falla

---

## 🖥️ **INTERFAZ DE USUARIO (React)**

### **Navegación Principal**
- **Sidebar**: Navegación entre secciones
- **Header**: Información del perfil actual
- **Footer**: Acciones globales (Nuke data)

### **Vistas Principales**
1. **Dashboard/Inicio**: Resumen de colección
2. **Manga List**: Lista completa de mangas
3. **Add Manga**: Formulario de creación
4. **Profile Management**: Gestión de perfiles
5. **Import Data**: Importación TSV
6. **Compare Collections**: Comparación entre perfiles

### **Componentes Reutilizables**
- **MangaCard**: Tarjeta individual de manga
- **EntryForm**: Formulario de seguimiento
- **FilterBar**: Filtros y búsqueda
- **Modal**: Diálogos para confirmaciones

---

## 🔌 **API ENDPOINTS**

### **MangaController**
```
GET    /api/manga              - Lista todos los mangas
GET    /api/manga/{id}         - Obtener manga específico
POST   /api/manga              - Crear nuevo manga
PUT    /api/manga/{id}         - Actualizar manga
DELETE /api/manga/{id}         - Eliminar manga
GET    /api/manga/isbn/{isbn}  - Buscar por ISBN
```

### **EntryController**
```
GET    /api/entry              - Lista entries del perfil actual
GET    /api/entry/{id}         - Obtener entry específico
POST   /api/entry              - Crear nuevo entry
PUT    /api/entry/{id}         - Actualizar entry
DELETE /api/entry/{id}         - Eliminar entry
POST   /api/entry/import       - Importar entries desde TSV
```

### **ProfileController**
```
GET    /api/profile            - Lista todos los perfiles
GET    /api/profile/{id}       - Obtener perfil específico
POST   /api/profile            - Crear nuevo perfil
PUT    /api/profile/{id}       - Actualizar perfil
DELETE /api/profile/{id}       - Eliminar perfil
POST   /api/profile/{id}/image - Subir imagen de perfil
```

### **PublisherController**
```
GET    /api/publisher          - Lista todos los publishers
GET    /api/publisher/{id}     - Obtener publisher específico
POST   /api/publisher          - Crear nuevo publisher
PUT    /api/publisher/{id}     - Actualizar publisher
DELETE /api/publisher/{id}     - Eliminar publisher
```

### **FormatController**
```
GET    /api/format             - Lista todos los formats
GET    /api/format/{id}        - Obtener format específico
POST   /api/format             - Crear nuevo format
PUT    /api/format/{id}        - Actualizar format
DELETE /api/format/{id}        - Eliminar format
```

---

## 🗄️ **BASE DE DATOS**

### **Tablas Principales**
- **Manga**: Información de cada manga
- **Entry**: Relación usuario-manga con progreso
- **Profile**: Perfiles de usuario
- **Publisher**: Editoriales
- **Format**: Formatos de publicación

### **Relaciones**
- Entry → Manga (Muchos a Uno)
- Entry → Profile (Muchos a Uno)
- Manga → Publisher (Muchos a Uno)
- Manga → Format (Muchos a Uno)

### **Backup**
- Ubicación: `databasebackup/backup.bak`
- Contenido: Datos de ejemplo + estructura completa
- Restauración: Via SQL Server Management Studio

---

## ⚙️ **CONFIGURACIÓN**

### **appsettings.json**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MangaCount;Trusted_Connection=True;"
  },
  "OpenLibrary": {
    "BaseUrl": "https://openlibrary.org"
  },
  "FileStorage": {
    "ProfileImagesPath": "wwwroot/images/profiles"
  }
}
```

### **Database Connection**
- **Server**: localhost (SQL Server local)
- **Database**: MangaCount
- **Authentication**: Windows Integrated Security

---

## 🧪 **TESTING MANUAL**

### **Escenarios a Probar Después de Migración**

#### **Funcionalidad Core**
- [ ] Crear perfil nuevo
- [ ] Cambiar entre perfiles
- [ ] Agregar manga manualmente
- [ ] Agregar manga por ISBN
- [ ] Crear entry para manga
- [ ] Actualizar progreso de lectura
- [ ] Importar colección TSV
- [ ] Comparar colecciones
- [ ] Subir imagen de perfil
- [ ] Eliminar manga/entry

#### **API Endpoints**
- [ ] Todos los GET endpoints responden correctamente
- [ ] POST/PUT/DELETE funcionan
- [ ] Validaciones de entrada funcionan
- [ ] Manejo de errores apropiado

#### **Frontend**
- [ ] Todas las vistas cargan correctamente
- [ ] Formularios funcionan
- [ ] Navegación funciona
- [ ] Filtros y búsqueda funcionan

#### **Performance**
- [ ] Tiempos de carga similares
- [ ] Memoria usage similar
- [ ] Database queries eficientes

---

## 🚨 **KNOWN ISSUES (Baseline)**
Documentar cualquier bug o issue conocido en la versión actual para asegurar que la migración no introduzca nuevos problemas.

### **Issues Conocidos**
- [ ] Listar issues específicos si existen
- [ ] Performance bottlenecks conocidos
- [ ] UI/UX issues
- [ ] API inconsistencies

---

## 📋 **CHECKLIST DE VERIFICACIÓN POST-MIGRACIÓN**

### **Para Cada Feature**
1. **Funciona igual**: La feature hace exactamente lo mismo que antes
2. **Misma UI**: El frontend se ve y comporta igual
3. **Misma performance**: No hay degradación de velocidad
4. **Mismos datos**: Los datos existentes siguen siendo válidos
5. **Mismas APIs**: Los endpoints responden igual

### **Validación por Usuario**
- [ ] Usuario final puede usar el sistema sin notar diferencia
- [ ] Flujo de trabajo completo funciona igual
- [ ] No se pierden datos durante migración
- [ ] Backup/restore funciona correctamente

---

## 📞 **SOPORTE**
- **Documentación Técnica**: Este documento
- **Código Fuente**: Comentarios en el código
- **Base de Datos**: Script de backup incluido
- **Configuración**: appsettings.json documentado
