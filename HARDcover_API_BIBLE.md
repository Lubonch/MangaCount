# 📚 Biblia de Integración: Hardcover API

## 🎯 **Visión General**

Hardcover.app es la fuente de datos primaria para información de manga y libros. Reemplaza completamente a AniList como proveedor de metadata, carátulas y información bibliográfica.

## 🏗️ **Arquitectura de Integración**

### **1. Capa de Servicio**
```
MangaCount.Application
├── Services/
│   ├── Hardcover/
│   │   ├── IHardcoverApiService.cs
│   │   ├── HardcoverApiService.cs
│   │   ├── Models/
│   │   │   ├── Book.cs
│   │   │   ├── Author.cs
│   │   │   ├── Publisher.cs
│   │   │   ├── SearchResult.cs
│   │   │   └── GraphQL/
│   │   │       ├── Queries.cs
│   │   │       └── Mutations.cs
│   │   └── Configuration/
│   │       └── HardcoverApiSettings.cs
```

### **2. Dependencias Requeridas**
```xml
<PackageReference Include="GraphQL.Client" Version="6.0.0" />
<PackageReference Include="GraphQL.Client.Serializer.Newtonsoft" Version="6.0.0" />
<PackageReference Include="Microsoft.Extensions.Http" Version="8.0.0" />
```

## 🔧 **Configuración**

### **1. appsettings.json**
```json
{
  "HardcoverApi": {
    "BaseUrl": "https://api.hardcover.app/v1/graphql",
    "ApiToken": "your_api_token_here",
    "TimeoutSeconds": 30,
    "RateLimitRequestsPerMinute": 60
  }
}
```

### **2. Program.cs / Startup.cs**
```csharp
builder.Services.AddHttpClient<IHardcoverApiService, HardcoverApiService>((sp, client) =>
{
    var settings = sp.GetRequiredService<IOptions<HardcoverApiSettings>>().Value;
    client.BaseAddress = new Uri(settings.BaseUrl);
    client.DefaultRequestHeaders.Add("Authorization", $"Bearer {settings.ApiToken}");
    client.Timeout = TimeSpan.FromSeconds(settings.TimeoutSeconds);
});
```

## 📋 **API Endpoints Planificados**

### **1. MangaController Endpoints**
```
GET  /api/manga/search/{query}           - Buscar manga
GET  /api/manga/{id}                     - Obtener detalles por ID
GET  /api/manga/isbn/{isbn}              - Buscar por ISBN
GET  /api/manga/publisher/{publisherId}  - Mangas por publisher
POST /api/manga/sync                     - Sincronizar con Hardcover
```

### **2. CoverController Endpoints**
```
GET  /api/covers/{mangaId}/{size}        - Obtener carátula
GET  /api/covers/batch                   - Carátulas múltiples
POST /api/covers/cache/clear             - Limpiar cache
```

## 🔍 **Queries GraphQL Principales**

### **1. Búsqueda de Manga**
```graphql
query SearchManga($query: String!, $limit: Int = 20) {
  search(query: $query, types: [BOOK], limit: $limit) {
    nodes {
      ... on Book {
        id
        title
        subtitle
        description
        cover {
          url
          width
          height
        }
        authors {
          name
        }
        publisher {
          name
        }
        isbn
        isbn13
        publicationYear
        pageCount
        genres {
          name
        }
        contributors {
          name
          role
        }
      }
    }
    totalCount
  }
}
```

### **2. Detalles Completos de Manga**
```graphql
query GetMangaDetails($id: ID!) {
  book(id: $id) {
    id
    title
    subtitle
    description
    cover {
      url
      width
      height
    }
    authors {
      name
      bio
    }
    publisher {
      name
      website
    }
    isbn
    isbn13
    publicationYear
    pageCount
    language
    genres {
      name
      description
    }
    series {
      name
      position
    }
    contributors {
      name
      role
      bio
    }
    editions {
      id
      title
      format
      publicationYear
      isbn
      pageCount
    }
  }
}
```

### **3. Búsqueda por Publisher**
```graphql
query GetPublisherBooks($publisherName: String!, $limit: Int = 50) {
  search(query: $publisherName, types: [PUBLISHER], limit: 1) {
    nodes {
      ... on Publisher {
        id
        name
        books(limit: $limit) {
          nodes {
            id
            title
            cover { url }
            publicationYear
            genres { name }
          }
        }
      }
    }
  }
}
```

## 🗂️ **Modelos de Datos**

### **1. Book (Manga)**
```csharp
public class Book
{
    public string Id { get; set; }
    public string Title { get; set; }
    public string? Subtitle { get; set; }
    public string? Description { get; set; }
    public CoverImage Cover { get; set; }
    public List<Author> Authors { get; set; }
    public Publisher Publisher { get; set; }
    public string? Isbn { get; set; }
    public string? Isbn13 { get; set; }
    public int? PublicationYear { get; set; }
    public int? PageCount { get; set; }
    public string? Language { get; set; }
    public List<Genre> Genres { get; set; }
    public Series? Series { get; set; }
    public List<Contributor> Contributors { get; set; }
    public List<Edition> Editions { get; set; }
}
```

### **2. CoverImage**
```csharp
public class CoverImage
{
    public string Url { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string? Format { get; set; }
}
```

### **3. Author**
```csharp
public class Author
{
    public string Name { get; set; }
    public string? Bio { get; set; }
    public string? Website { get; set; }
    public DateTime? BirthDate { get; set; }
    public DateTime? DeathDate { get; set; }
}
```

## 🔄 **Estrategia de Sincronización**

### **1. Cache Local**
- **Redis/SQLite** para datos frecuentemente accedidos
- **TTL**: 24 horas para datos generales, 7 días para carátulas
- **Invalidación**: Manual y automática por cambios

### **2. Rate Limiting**
- **60 requests/minuto** (límite de Hardcover)
- **Queue system** para requests masivos
- **Backoff exponencial** en caso de errores

### **3. Sync Programado**
```csharp
public class SyncScheduler
{
    // Sincronización diaria de publishers populares
    // Sincronización semanal de catálogo completo
    // Sincronización bajo demanda para búsquedas específicas
}
```

## 🧪 **Testing Strategy**

### **1. Unit Tests**
```csharp
[Test]
public async Task SearchManga_ReturnsValidResults()
{
    // Arrange
    var service = new HardcoverApiService(_httpClient, _settings);

    // Act
    var results = await service.SearchMangaAsync("One Piece");

    // Assert
    results.Should().NotBeNull();
    results.Should().HaveCountGreaterThan(0);
}
```

### **2. Integration Tests**
```csharp
[Test]
public async Task GraphQL_Query_ExecutesSuccessfully()
{
    // Test real contra API de Hardcover
    // Verificar rate limits
    // Validar estructura de respuesta
}
```

## 📊 **Métricas y Monitoreo**

### **1. Métricas a Trackear**
- **Response Time**: Latencia promedio de API
- **Success Rate**: Porcentaje de requests exitosos
- **Rate Limit Usage**: Uso del límite de requests
- **Cache Hit Rate**: Efectividad del cache
- **Data Freshness**: Actualización de datos

### **2. Health Checks**
```csharp
public class HardcoverHealthCheck : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken)
    {
        // Verificar conectividad con API
        // Validar token de autenticación
        // Check rate limit status
    }
}
```

## 🚨 **Manejo de Errores**

### **1. Tipos de Error**
- **Rate Limit Exceeded**: Esperar y retry con backoff
- **Authentication Failed**: Refresh token
- **Book Not Found**: Fallback a otras fuentes
- **Network Errors**: Retry con circuit breaker

### **2. Circuit Breaker Pattern**
```csharp
public class HardcoverCircuitBreaker
{
    // Implementar patrón circuit breaker
    // para manejar fallos temporales de API
}
```

## 🔄 **Migración desde AniList**

### **1. Mapping de Datos**
```csharp
public class DataMapper
{
    // Mapear IDs de AniList a Hardcover
    // Mapear campos equivalentes
    // Manejar datos faltantes
}
```

### **2. Fallback Strategy**
```csharp
public class FallbackDataSource
{
    // Usar AniList como backup si Hardcover falla
    // Gradual migration de datos
    // Data validation entre fuentes
}
```

## 📈 **Escalabilidad**

### **1. Optimizaciones**
- **GraphQL Query Batching**: Múltiples queries en una request
- **Response Compression**: GZIP para reducir bandwidth
- **Pagination**: Manejo eficiente de resultados grandes
- **Webhooks**: Notificaciones de cambios (si están disponibles)

### **2. Arquitectura Futura**
- **Microservicio dedicado** para integraciones externas
- **Event-driven architecture** para sync
- **Multi-region deployment** para mejor performance

---

## 🎯 **Checklist de Implementación**

### **Fase 1: Core Integration** ✅
- [ ] Configurar HttpClient con autenticación
- [ ] Implementar queries básicas de búsqueda
- [ ] Crear modelos de datos
- [ ] Setup de configuración

### **Fase 2: Advanced Features** 🔄
- [ ] Implementar cache local
- [ ] Rate limiting y circuit breaker
- [ ] Sync programado
- [ ] Health checks

### **Fase 3: Production Ready** ⏳
- [ ] Testing completo
- [ ] Monitoreo y métricas
- [ ] Documentación de API
- [ ] Migración desde AniList

### **Fase 4: Optimization** 📅
- [ ] Query batching
- [ ] Response compression
- [ ] Webhook integration
- [ ] Performance optimization</content>
<parameter name="filePath">c:\repos\MangaCount\HARDcover_API_BIBLE.md
