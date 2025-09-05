# 📚 ANILIST BIBLE - Guía Completa de Integración

## 🎯 **ÍNDICE EJECUTIVO**

### **Secciones Principales**
1. [¿Qué es AniList?](#qué-es-anilist)
2. [Arquitectura de la API](#arquitectura-de-la-api)
3. [GraphQL Schema Completo](#graphql-schema-completo)
4. [Queries para Manga](#queries-para-manga)
5. [Queries para Imágenes](#queries-para-imágenes)
6. [Rate Limits y Optimización](#rate-limits-y-optimización)
7. [Implementación en .NET](#implementación-en-net)
8. [Manejo de Errores](#manejo-de-errores)
9. [Caching Strategy](#caching-strategy)
10. [Testing y Validación](#testing-y-validación)

---

## 🎬 **¿QUÉ ES ANILIST?**

### **Definición y Propósito**
AniList es una plataforma de seguimiento y descubrimiento de anime y manga que permite a los usuarios:
- **Rastrear progreso** de series que están viendo/leyendo
- **Calificar y reseñar** contenido
- **Crear listas personalizadas** (Watching, Completed, Planning, etc.)
- **Social networking** con otros fans
- **Descubrir nuevo contenido** a través de recomendaciones

### **Estadísticas Clave (2025)**
- **Usuarios activos**: 2.5+ millones
- **Base de datos**: 15,000+ anime, 50,000+ manga
- **Cobertura**: Anime desde 1917, Manga desde 1800s
- **Actualizaciones**: Datos actualizados diariamente
- **Idiomas**: 15+ idiomas soportados

### **Ventajas para MangaCount**
- ✅ **Base de datos masiva** y actualizada
- ✅ **Imágenes de alta calidad** para portadas
- ✅ **Metadatos completos** (autores, géneros, sinopsis)
- ✅ **API gratuita** sin costos
- ✅ **Comunidad activa** con datos crowdsourced
- ✅ **Soporte multilingüe**

---

## 🏗️ **ARQUITECTURA DE LA API**

### **Tipo de API**
- **GraphQL**: Lenguaje de consulta para APIs
- **Endpoint único**: `https://graphql.anilist.co`
- **HTTP Method**: POST (para queries/mutations)
- **Content-Type**: `application/json`

### **Autenticación**
```javascript
// Sin autenticación (para datos públicos)
fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: YOUR_QUERY_HERE
  })
})
```

### **Estructura de Request**
```json
{
  "query": "query { Media(id: 1) { title { romaji } } }",
  "variables": {
    "id": 1,
    "type": "MANGA"
  }
}
```

### **Estructura de Response**
```json
{
  "data": {
    "Media": {
      "title": {
        "romaji": "One Piece"
      }
    }
  }
}
```

---

## 📊 **GRAPHQL SCHEMA COMPLETO**

### **Tipos de Media**
```graphql
enum MediaType {
  ANIME
  MANGA
}

enum MediaFormat {
  TV
  TV_SHORT
  MOVIE
  SPECIAL
  OVA
  ONA
  MUSIC
  MANGA
  NOVEL
  ONE_SHOT
  DOUJINSHI
  MANHWA
  MANHUA
  OEL
}

enum MediaStatus {
  FINISHED
  RELEASING
  NOT_YET_RELEASED
  CANCELLED
  HIATUS
}
```

### **Objeto Media Principal**
```graphql
type Media {
  id: Int!
  title: MediaTitle!
  type: MediaType!
  format: MediaFormat
  status: MediaStatus
  description: String
  startDate: FuzzyDate
  endDate: FuzzyDate
  season: MediaSeason
  seasonYear: Int
  episodes: Int
  duration: Int
  chapters: Int
  volumes: Int
  countryOfOrigin: CountryCode
  isLicensed: Boolean
  source: MediaSource
  hashtag: String
  trailer: MediaTrailer
  updatedAt: Int
  coverImage: MediaCoverImage!
  bannerImage: String
  genres: [String!]!
  synonyms: [String!]!
  averageScore: Int
  meanScore: Int
  popularity: Int
  isLocked: Boolean
  trending: Int
  favourites: Int
  tags: [MediaTag!]!
  relations: MediaConnection!
  characters: CharacterConnection!
  staff: StaffConnection!
  studios: StudioConnection!
  isFavourite: Boolean!
  isFavouriteBlocked: Boolean!
  isAdult: Boolean
  nextAiringEpisode: AiringSchedule
  airingSchedule: AiringScheduleConnection!
  trends: MediaTrendConnection!
  externalLinks: [MediaExternalLink!]!
  streamingEpisodes: [MediaStreamingEpisode!]!
  rankings: [MediaRank!]!
  mediaListEntry: MediaList
  reviews: ReviewConnection!
  recommendations: RecommendationConnection!
  stats: MediaStats!
  siteUrl: String!
  autoCreateForumThread: Boolean
  isRecommendationBlocked: Boolean
  isReviewBlocked: Boolean
  modNotes: String
}
```

### **Objeto MediaCoverImage**
```graphql
type MediaCoverImage {
  extraLarge: String
  large: String
  medium: String
  color: String
}
```

### **Objeto MediaTitle**
```graphql
type MediaTitle {
  romaji: String
  english: String
  native: String
  userPreferred: String
}
```

---

## 🔍 **QUERIES PARA MANGA**

### **Query Básica de Manga por ID**
```graphql
query GetMangaById($id: Int) {
  Media(id: $id, type: MANGA) {
    id
    title {
      romaji
      english
      native
    }
    description
    format
    status
    chapters
    volumes
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    genres
    averageScore
    popularity
    siteUrl
  }
}
```

### **Query de Búsqueda de Manga**
```graphql
query SearchManga($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
      perPage
    }
    media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
      id
      title {
        romaji
        english
      }
      format
      status
      chapters
      volumes
      averageScore
      popularity
      coverImage {
        large
        medium
      }
    }
  }
}
```

### **Query con Información Completa**
```graphql
query GetMangaDetailed($id: Int) {
  Media(id: $id, type: MANGA) {
    id
    title {
      romaji
      english
      native
      userPreferred
    }
    description
    format
    status
    chapters
    volumes
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
    countryOfOrigin
    isLicensed
    source
    genres
    synonyms
    averageScore
    meanScore
    popularity
    favourites
    tags {
      name
      description
      category
      rank
      isGeneralSpoiler
      isMediaSpoiler
      isAdult
    }
    staff {
      edges {
        role
        node {
          id
          name {
            full
            native
          }
        }
      }
    }
    relations {
      edges {
        relationType
        node {
          id
          title {
            romaji
          }
          type
        }
      }
    }
    externalLinks {
      url
      site
    }
    siteUrl
  }
}
```

---

## 🖼️ **QUERIES PARA IMÁGENES**

### **Query de Portada Básica**
```graphql
query GetMangaCover($id: Int) {
  Media(id: $id, type: MANGA) {
    id
    title {
      romaji
    }
    coverImage {
      extraLarge
      large
      medium
      color
    }
  }
}
```

### **Query de Múltiples Portadas**
```graphql
query GetMultipleCovers($ids: [Int]) {
  Page {
    media(id_in: $ids, type: MANGA) {
      id
      title {
        romaji
      }
      coverImage {
        extraLarge
        large
        medium
      }
    }
  }
}
```

### **Query Optimizada para Cache**
```graphql
query GetCoversForCache($search: String, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    media(search: $search, type: MANGA) {
      id
      coverImage {
        large
      }
      updatedAt
    }
  }
}
```

---

## ⚡ **RATE LIMITS Y OPTIMIZACIÓN**

### **Rate Limits Oficiales**
- **Requests por hora**: 90 (para usuarios no autenticados)
- **Requests por minuto**: No especificado, pero ~1-2 por segundo recomendado
- **Bursting**: Permitido pero con cooldown
- **Autenticación**: Aumenta a 2000 requests/hora

### **Estrategias de Optimización**

#### **1. Batching Queries**
```graphql
query BatchMangaQuery($ids: [Int!]) {
  manga1: Media(id: $ids[0], type: MANGA) { id title { romaji } coverImage { large } }
  manga2: Media(id: $ids[1], type: MANGA) { id title { romaji } coverImage { large } }
  manga3: Media(id: $ids[2], type: MANGA) { id title { romaji } coverImage { large } }
}
```

#### **2. Field Selection Estratégica**
```graphql
# ❌ Ineficiente - trae todo
query Inefficient { Media(id: 1) }

# ✅ Eficiente - solo campos necesarios
query Efficient {
  Media(id: 1, type: MANGA) {
    id
    title { romaji }
    coverImage { large }
  }
}
```

#### **3. Pagination Inteligente**
```graphql
query PaginatedSearch($page: Int) {
  Page(page: $page, perPage: 20) {
    pageInfo {
      hasNextPage
      total
    }
    media(type: MANGA, sort: POPULARITY_DESC) {
      id
      title { romaji }
      coverImage { large }
    }
  }
}
```

### **Caching Strategy**
```csharp
// Estrategia de cache recomendada
public class AniListCacheStrategy
{
    // Cache por 24 horas para datos básicos
    public TimeSpan MangaDataCache => TimeSpan.FromHours(24);

    // Cache por 7 días para imágenes
    public TimeSpan ImageCache => TimeSpan.FromDays(7);

    // Cache por 1 hora para búsquedas populares
    public TimeSpan SearchCache => TimeSpan.FromHours(1);
}
```

---

## 🔧 **IMPLEMENTACIÓN EN .NET**

### **Configuración del Cliente GraphQL**
```csharp
using GraphQL.Client.Http;
using GraphQL.Client.Serializer.Newtonsoft;

public class AniListGraphQLClient
{
    private readonly GraphQLHttpClient _client;

    public AniListGraphQLClient()
    {
        _client = new GraphQLHttpClient(
            "https://graphql.anilist.co",
            new NewtonsoftJsonSerializer()
        );
    }
}
```

### **Servicio de Manga**
```csharp
public class AniListMangaService
{
    private readonly GraphQLHttpClient _client;

    public async Task<MangaData> GetMangaByIdAsync(int id)
    {
        var query = @"
            query GetManga($id: Int) {
                Media(id: $id, type: MANGA) {
                    id
                    title { romaji english }
                    description
                    coverImage { large medium }
                    chapters
                    volumes
                    status
                    genres
                }
            }";

        var request = new GraphQLRequest
        {
            Query = query,
            Variables = new { id }
        };

        var response = await _client.SendQueryAsync<dynamic>(request);
        return MapToMangaData(response.Data.Media);
    }
}
```

### **Servicio de Imágenes**
```csharp
public class AniListImageService
{
    private readonly HttpClient _httpClient;
    private readonly string _cacheDirectory;

    public AniListImageService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _cacheDirectory = Path.Combine("wwwroot", "images", "cache");
        Directory.CreateDirectory(_cacheDirectory);
    }

    public async Task<string> GetOptimizedCoverImageAsync(int mangaId, ImageSize size)
    {
        var cacheKey = $"manga_{mangaId}_{size}";
        var cachePath = Path.Combine(_cacheDirectory, $"{cacheKey}.jpg");

        // Check cache first
        if (File.Exists(cachePath))
        {
            return $"/images/cache/{cacheKey}.jpg";
        }

        // Fetch from AniList
        var imageUrl = await GetCoverImageUrlAsync(mangaId, size);

        // Download and optimize
        using var response = await _httpClient.GetAsync(imageUrl);
        using var stream = await response.Content.ReadAsStreamAsync();
        using var image = await Image.LoadAsync(stream);

        // Optimize based on size
        var optimizedImage = OptimizeImage(image, size);

        // Save to cache
        await optimizedImage.SaveAsJpegAsync(cachePath, quality: 85);

        return $"/images/cache/{cacheKey}.jpg";
    }
}
```

### **Gestión de Rate Limits**
```csharp
public class RateLimitHandler
{
    private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1);
    private DateTime _lastRequest = DateTime.MinValue;
    private readonly TimeSpan _minInterval = TimeSpan.FromMilliseconds(500); // 2 req/sec

    public async Task<T> ExecuteWithRateLimitAsync<T>(Func<Task<T>> operation)
    {
        await _semaphore.WaitAsync();

        try
        {
            var timeSinceLastRequest = DateTime.Now - _lastRequest;
            if (timeSinceLastRequest < _minInterval)
            {
                await Task.Delay(_minInterval - timeSinceLastRequest);
            }

            _lastRequest = DateTime.Now;
            return await operation();
        }
        finally
        {
            _semaphore.Release();
        }
    }
}
```

---

## 🚨 **MANEJO DE ERRORES**

### **Tipos de Errores Comunes**

#### **1. Rate Limit Exceeded**
```json
{
  "errors": [
    {
      "message": "Too Many Requests",
      "status": 429,
      "locations": []
    }
  ]
}
```

#### **2. Invalid Query**
```json
{
  "errors": [
    {
      "message": "Cannot query field 'invalidField' on type 'Media'",
      "locations": [
        {
          "line": 3,
          "column": 5
        }
      ]
    }
  ]
}
```

#### **3. Media Not Found**
```json
{
  "errors": [
    {
      "message": "Not Found",
      "status": 404
    }
  ]
}
```

### **Implementación de Error Handling**
```csharp
public class AniListExceptionHandler
{
    public async Task<T> ExecuteWithErrorHandlingAsync<T>(Func<Task<T>> operation)
    {
        try
        {
            return await operation();
        }
        catch (GraphQLHttpRequestException ex) when (ex.StatusCode == 429)
        {
            // Rate limit exceeded
            await Task.Delay(TimeSpan.FromMinutes(1));
            return await ExecuteWithErrorHandlingAsync(operation);
        }
        catch (GraphQLHttpRequestException ex) when (ex.StatusCode == 404)
        {
            // Media not found
            throw new MangaNotFoundException("Manga not found in AniList");
        }
        catch (Exception ex)
        {
            // Log and rethrow
            _logger.LogError(ex, "AniList API error");
            throw new AniListServiceException("Failed to fetch data from AniList", ex);
        }
    }
}
```

---

## 💾 **CACHING STRATEGY**

### **Niveles de Cache**

#### **1. Memory Cache (Hot Data)**
```csharp
public class MemoryCacheService
{
    private readonly IMemoryCache _cache;

    public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan expiration)
    {
        if (!_cache.TryGetValue(key, out T result))
        {
            result = await factory();
            _cache.Set(key, result, expiration);
        }
        return result;
    }
}
```

#### **2. File System Cache (Images)**
```csharp
public class FileCacheService
{
    public async Task<string> GetCachedImagePathAsync(string key, Func<Task<byte[]>> fetcher)
    {
        var filePath = GetCacheFilePath(key);

        if (File.Exists(filePath))
        {
            var fileInfo = new FileInfo(filePath);
            if (DateTime.Now - fileInfo.LastWriteTime < TimeSpan.FromDays(7))
            {
                return filePath;
            }
        }

        var imageData = await fetcher();
        await File.WriteAllBytesAsync(filePath, imageData);
        return filePath;
    }
}
```

#### **3. Database Cache (Metadata)**
```csharp
public class DatabaseCacheService
{
    public async Task<MangaMetadata> GetCachedMangaAsync(int aniListId)
    {
        var cached = await _context.CachedMangas
            .FirstOrDefaultAsync(m => m.AniListId == aniListId);

        if (cached != null && IsCacheValid(cached.LastUpdated))
        {
            return cached;
        }

        // Fetch from AniList and cache
        var freshData = await _aniListService.GetMangaByIdAsync(aniListId);
        await CacheMangaAsync(freshData);

        return freshData;
    }
}
```

### **Cache Invalidation Strategy**
```csharp
public class CacheInvalidationService
{
    public async Task InvalidateMangaCacheAsync(int mangaId)
    {
        // Invalidate memory cache
        _memoryCache.Remove($"manga_{mangaId}");

        // Invalidate file cache
        var imagePath = GetCacheFilePath($"manga_{mangaId}_large");
        if (File.Exists(imagePath))
        {
            File.Delete(imagePath);
        }

        // Invalidate database cache
        var cached = await _context.CachedMangas
            .FirstOrDefaultAsync(m => m.AniListId == mangaId);
        if (cached != null)
        {
            _context.CachedMangas.Remove(cached);
            await _context.SaveChangesAsync();
        }
    }
}
```

---

## 🧪 **TESTING Y VALIDACIÓN**

### **Unit Tests para AniListService**
```csharp
public class AniListServiceTests
{
    [Fact]
    public async Task GetMangaByIdAsync_ReturnsMangaData_WhenValidId()
    {
        // Arrange
        var mockClient = new Mock<IGraphQLClient>();
        var service = new AniListService(mockClient.Object);

        // Act
        var result = await service.GetMangaByIdAsync(1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("One Piece", result.Title);
    }

    [Fact]
    public async Task GetMangaByIdAsync_ThrowsException_WhenMangaNotFound()
    {
        // Arrange
        var mockClient = new Mock<IGraphQLClient>();
        mockClient.Setup(c => c.SendQueryAsync(It.IsAny<GraphQLRequest>()))
            .ThrowsAsync(new GraphQLHttpRequestException("Not Found", 404));

        var service = new AniListService(mockClient.Object);

        // Act & Assert
        await Assert.ThrowsAsync<MangaNotFoundException>(
            () => service.GetMangaByIdAsync(999999));
    }
}
```

### **Integration Tests**
```csharp
public class AniListIntegrationTests : IClassFixture<AniListWebApplicationFactory>
{
    private readonly AniListWebApplicationFactory _factory;

    public AniListIntegrationTests(AniListWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task MangaController_GetCoverImage_ReturnsImage()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/manga/cover/1");

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType.MediaType);
    }
}
```

### **Load Testing**
```csharp
public class AniListLoadTests
{
    [Fact]
    public async Task GetMultipleCovers_HandlesLoad_WithoutRateLimitErrors()
    {
        // Arrange
        var service = new AniListService();
        var mangaIds = Enumerable.Range(1, 50).ToArray();

        // Act
        var tasks = mangaIds.Select(id => service.GetCoverImageUrlAsync(id));
        var results = await Task.WhenAll(tasks);

        // Assert
        Assert.All(results, url => Assert.NotNull(url));
        Assert.All(results, url => Assert.StartsWith("https://", url));
    }
}
```

---

## 📈 **MÉTRICAS Y MONITORING**

### **Métricas a Monitorear**
```csharp
public class AniListMetrics
{
    private readonly Counter _requestsCounter;
    private readonly Histogram _requestDuration;
    private readonly Counter _errorsCounter;
    private readonly Counter _rateLimitHits;

    public AniListMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("AniList");

        _requestsCounter = meter.CreateCounter<int>("anilist_requests_total");
        _requestDuration = meter.CreateHistogram<double>("anilist_request_duration_seconds");
        _errorsCounter = meter.CreateCounter<int>("anilist_errors_total");
        _rateLimitHits = meter.CreateCounter<int>("anilist_rate_limit_hits_total");
    }

    public void RecordRequest(string operation, TimeSpan duration, bool success)
    {
        _requestsCounter.Add(1, new KeyValuePair<string, object>("operation", operation));
        _requestDuration.Record(duration.TotalSeconds, new KeyValuePair<string, object>("operation", operation));

        if (!success)
        {
            _errorsCounter.Add(1, new KeyValuePair<string, object>("operation", operation));
        }
    }

    public void RecordRateLimitHit()
    {
        _rateLimitHits.Add(1);
    }
}
```

---

## 🔄 **MIGRACIÓN Y VERSIONADO**

### **Versionado de API**
- AniList no tiene versiones explícitas
- Schema puede cambiar sin aviso
- Recomendación: Implementar schema validation

### **Backward Compatibility**
```csharp
public class SchemaValidator
{
    public async Task ValidateSchemaAsync()
    {
        // Query introspection to validate expected fields exist
        var introspectionQuery = @"
            query IntrospectionQuery {
                __schema {
                    types {
                        name
                        fields {
                            name
                        }
                    }
                }
            }";

        var response = await _client.SendQueryAsync<dynamic>(introspectionQuery);

        // Validate critical fields exist
        ValidateFieldExists(response, "Media", "title");
        ValidateFieldExists(response, "Media", "coverImage");
        ValidateFieldExists(response, "MediaCoverImage", "large");
    }
}
```

---

## 🎯 **BEST PRACTICES**

### **1. Error Handling**
- ✅ Implementar retry logic con exponential backoff
- ✅ Manejar rate limits gracefully
- ✅ Proporcionar fallbacks para datos faltantes
- ✅ Loggear errores para debugging

### **2. Performance**
- ✅ Usar batching para múltiples requests
- ✅ Implementar caching agresivo
- ✅ Optimizar queries (solo campos necesarios)
- ✅ Usar pagination para búsquedas grandes

### **3. Reliability**
- ✅ Implementar circuit breaker pattern
- ✅ Monitorear health de la API
- ✅ Tener fallbacks alternativos
- ✅ Validar datos antes de usar

### **4. Security**
- ✅ No exponer API keys
- ✅ Validar inputs
- ✅ Sanitizar datos de respuesta
- ✅ Implementar timeouts

---

## 📚 **REFERENCIAS Y RECURSOS**

### **Documentación Oficial**
- [AniList GraphQL Explorer](https://anilist.gitbook.io/anilist-apiv2-docs/)
- [GraphQL Schema Documentation](https://graphql.anilist.co/)
- [AniList API Reference](https://anilist.co/graphiql)

### **Herramientas Útiles**
- [GraphQL Playground](https://graphql.anilist.co/)
- [AniList API Client Libraries](https://github.com/topics/anilist-api)
- [GraphQL Code Generator](https://graphql-code-generator.com/)

### **Comunidades**
- [AniList Discord](https://discord.gg/anilist)
- [Reddit r/anime](https://reddit.com/r/anime)
- [AniList Forums](https://anilist.co/forum)

---

## 🚀 **ROADMAP DE INTEGRACIÓN**

### **Fase 1: Core Integration** ✅
- [x] GraphQL client setup
- [x] Basic manga queries
- [x] Image fetching
- [x] Error handling

### **Fase 2: Advanced Features** 🔄
- [ ] Batch operations
- [ ] Advanced caching
- [ ] Search optimization
- [ ] Real-time updates

### **Fase 3: Production Ready** 📋
- [ ] Monitoring y alerting
- [ ] Load testing
- [ ] Documentation completa
- [ ] Backup strategies

---

*Esta guía es una referencia completa para integrar AniList en MangaCount. Úsala como biblia para todas las decisiones técnicas relacionadas con la API de AniList.*</content>
<parameter name="filePath">c:\repos\MangaCount\ANILIST_BIBLE.md
