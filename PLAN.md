# MangaCount - Plan de Desarrollo 2026

## 📊 Estado Actual del Proyecto (Abril 2026)

### 🛠️ **Stack Tecnológico Real (Implementado):**
- **Backend:** .NET 8 + ASP.NET Core Web API + SQL Server + Dapper
- **Frontend:** React 19 + Vite + CSS Modules
- **Base de datos:** SQL Server con modelo normalizado
- **Arquitectura:** Capas tradicionales (Controllers → Services → Data)

### ✅ **Completado (≈75% del proyecto):**

#### **Backend (.NET 8):**
- [x] API REST completa con múltiples controladores
- [x] Conexión SQL Server con Dapper configurada  
- [x] Modelo de datos normalizado (Profile→Entry→Manga→Format/Publisher)
- [x] AutoMapper para DTOs
- [x] CORS configurado para desarrollo
- [x] Swagger/OpenAPI documentation

#### **Frontend (React 19):**
- [x] UI moderna con componentes funcionales
- [x] Sistema multi-perfil con localStorage
- [x] CRUD completo con modales
- [x] Filtros básicos funcionales
- [x] Sistema de themes (claro/oscuro)
- [x] Estados de loading y error handling básico
- [x] Responsive design

#### **Base de Datos:**
- [x] Esquema SQL Server normalizado
- [x] Backup funcional incluido
- [x] Relaciones FK correctamente definidas

### 🟡 **Parcialmente Implementado (≈15%):**

#### **Importación/Exportación:**
- [x] Backend: Lógica de importación TSV
- [x] Frontend: UI de importación funcional
- [x] Backend: Endpoint de exportación existe
- [ ] Frontend: UI de exportación pendiente

#### **Bot WhatsApp:**
- [ ] **ESTADO REAL:** En desarrollo inicial, NO completado
- [ ] Estructura básica Node.js creada
- [ ] Integración con API pendiente
- [ ] Sistema de comandos por implementar
- [ ] Testing y estabilización pendiente

### ❌ **No Implementado (≈10%):**
- [ ] Integración Jikan API para imágenes
- [ ] Dashboard de estadísticas
- [ ] Búsqueda avanzada en frontend
- [ ] Sistema de testing automatizado
- [ ] Optimización de performance
- [ ] Documentación técnica completa

---

## 🎯 **Plan de Desarrollo Priorizado**

### **🔴 Fase 1: Funcionalidades Core (Semanas 1-2)**

#### **P1.1: Integración Jikan API** 
*Prioridad: CRÍTICA* | *Tiempo: 3-4 días*

**Backend (.NET):**
```csharp
// Crear JikanService.cs
public class JikanService 
{
    public async Task<string> GetMangaImageAsync(string title)
    // Implementar rate limiting
    // Cache de imágenes
    // Fallback a placeholder
}
```

**Frontend (React):**
```jsx
// Crear useMangaImage.js hook
// Integrar en componentes de lista
// Loading states para imágenes
```

**Entregables:**
- [ ] Servicio Jikan funcional
- [ ] Cache de imágenes implementado
- [ ] UI mostrando imágenes reales

#### **P1.2: Completar UI de Exportación**
*Prioridad: CRÍTICA* | *Tiempo: 2 días*

**Frontend (React):**
- [ ] Componente ExportModal.jsx
- [ ] Botón export en sidebar
- [ ] Conectar con API existente
- [ ] Descarga automática de archivos

**Entregables:**
- [ ] Exportación TSV desde UI funcional
- [ ] Múltiples formatos de exportación

#### **P1.3: Búsqueda Avanzada Frontend**
*Prioridad: CRÍTICA* | *Tiempo: 3 días*

**Frontend (React):**
- [ ] Componente SearchBar avanzado
- [ ] Filtros combinados (texto + formato + estado)
- [ ] Búsqueda en tiempo real
- [ ] Persistencia de filtros

**Entregables:**
- [ ] Búsqueda instantánea funcional
- [ ] Filtros múltiples operativos

---

### **🟠 Fase 2: Dashboard y Mejoras UX (Semanas 2-3)**

#### **P2.1: Dashboard de Estadísticas**
*Prioridad: ALTA* | *Tiempo: 4-5 días*

**Backend (.NET):**
```csharp
// Crear StatsController.cs
[ApiController]
public class StatsController 
{
    [HttpGet("profile/{profileId}")]
    public async Task<StatsDto> GetProfileStats(int profileId)
    // Calcular métricas de completitud
    // Top formatos y editoriales  
    // Progreso de lectura
}
```

**Frontend (React):**
- [ ] Componente Dashboard.jsx
- [ ] Gráficos básicos (Chart.js/Recharts)
- [ ] Métricas visuales atractivas

**Entregables:**
- [ ] Dashboard con estadísticas completas
- [ ] Visualizaciones gráficas funcionales

#### **P2.2: Mejoras UX Críticas**
*Prioridad: ALTA* | *Tiempo: 3-4 días*

**Frontend (React):**
- [ ] Loading skeletons en lugar de spinners  
- [ ] Toast notifications para feedback
- [ ] Confirmaciones para borrar
- [ ] Mejoras de responsive móvil
- [ ] Animaciones CSS suaves

**Entregables:**
- [ ] UX pulida y profesional
- [ ] Feedback visual mejorado

---

### **🟡 Fase 3: Bot WhatsApp y Testing (Semanas 3-4)**

#### **P3.1: Bot WhatsApp Real**
*Prioridad: MEDIA* | *Tiempo: 5-6 días*

**ESTADO ACTUAL: Básico, requiere desarrollo completo**

**Node.js Bot:**
```javascript
// Reestructurar completamente
// Sistema de comandos robusto
// Integración real con API
// Manejo de sesiones por usuario
// Testing y estabilización
```

**Comandos a implementar:**
- [ ] `/manga add "título" vol:X`
- [ ] `/manga list [filtro]`
- [ ] `/stats`
- [ ] `/profile set "nombre"`

**Entregables:**
- [ ] Bot WhatsApp completamente funcional
- [ ] Documentación de comandos
- [ ] Sistema de testing para bot

#### **P3.2: Testing Automatizado**
*Prioridad: MEDIA* | *Tiempo: 4-5 días*

**Backend (.NET):**
```csharp
// xUnit + FluentAssertions
// Tests unitarios para Services
// Tests de integración para Controllers  
// Mock de dependencias
```

**Frontend (React):**
```javascript
// Vitest + Testing Library
// Tests de componentes
// Tests de hooks custom
// Coverage reporting
```

**Entregables:**
- [ ] >70% cobertura backend
- [ ] >60% cobertura frontend
- [ ] CI/CD con tests automáticos

---

### **🟢 Fase 4: Optimización y Documentación (Semana 5+)**

#### **P4.1: Optimización Performance**
*Prioridad: BAJA* | *Tiempo: 3-4 días*

**Backend:**
- [ ] Paginación en endpoints de listas
- [ ] Índices de base de datos optimizados
- [ ] Cache de queries frecuentes

**Frontend:**
- [ ] Lazy loading de imágenes
- [ ] Virtualización para listas grandes
- [ ] Memoización de componentes

#### **P4.2: Documentación Técnica**
*Prioridad: BAJA* | *Tiempo: 2-3 días*

- [ ] README técnico detallado
- [ ] Documentación de arquitectura
- [ ] Guía de contribución
- [ ] API documentation completa

---

## 📈 **Métricas de Éxito**

### **Funcionales:**
- [ ] 100% de funcionalidades core implementadas
- [ ] Todas las imágenes de manga visibles (real o placeholder)
- [ ] Exportación funcional desde UI
- [ ] Dashboard de estadísticas operativo
- [ ] Bot WhatsApp con comandos básicos funcionales

### **Técnicas:**
- [ ] >70% cobertura de tests en backend
- [ ] >60% cobertura de tests en frontend
- [ ] <2s tiempo de carga inicial
- [ ] <500ms tiempo de navegación entre pantallas
- [ ] 0 errores críticos en producción

### **UX:**
- [ ] Feedback visual en todas las acciones
- [ ] Responsive funcional en móvil
- [ ] Loading states en operaciones asíncronas
- [ ] Manejo de errores usuario-friendly

---

## 🚨 **Notas Importantes**

### **Estado Real vs. Aspiracional:**
- ❌ **Bot WhatsApp NO está completado** - requiere desarrollo desde cero
- ❌ **No hay Angular/Entity Framework** - el proyecto usa React/Dapper
- ❌ **No hay arquitectura hexagonal** - usa capas tradicionales
- ✅ **Backend y Frontend core SÍ están funcionales**

### **Prioridades de Desarrollo:**
1. **Primero:** Completar funcionalidades core que faltan
2. **Segundo:** Mejorar UX y añadir dashboard  
3. **Tercero:** Implementar bot WhatsApp correctamente
4. **Cuarto:** Testing y optimización

### **Tecnologías Confirmadas:**
- .NET 8 (no .NET 10)
- React 19 (no Angular)  
- SQL Server + Dapper (no SQLite + EF)
- Node.js para bot (estructura por definir)

---

**Última actualización:** Abril 2026  
**Estado del proyecto:** 75% completado, base sólida, requiere funcionalidades específicas  
**Próximo milestone:** Integración Jikan API + UI Exportación (Semana 1)
