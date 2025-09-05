# 🕷️ Biblia de Web Scraping: Publishers Argentinos

## 🎯 **Visión General**

El web scraping es la estrategia secundaria para obtener datos de manga cuando no hay APIs disponibles. Se enfoca en publishers argentinos y latinoamericanos que no ofrecen APIs públicas.

## 🏗️ **Arquitectura de Scraping**

### **1. Capa de Servicio**
```
MangaCount.Application
├── Services/
│   ├── Scraping/
│   │   ├── IPublisherScrapingService.cs
│   │   ├── PublisherScrapingService.cs
│   │   ├── Strategies/
│   │   │   ├── IvreaScrapingStrategy.cs
│   │   │   ├── PaniniScrapingStrategy.cs
│   │   │   ├── OvniPressScrapingStrategy.cs
│   │   │   └── VizMediaScrapingStrategy.cs
│   │   ├── Models/
│   │   │   ├── ScrapedManga.cs
│   │   │   ├── ScrapingResult.cs
│   │   │   └── ScrapingMetadata.cs
│   │   └── Configuration/
│   │       └── ScrapingSettings.cs
```

### **2. Dependencias Requeridas**
```xml
<PackageReference Include="HtmlAgilityPack" Version="1.11.46" />
<PackageReference Include="PuppeteerSharp" Version="8.0.0" />
<PackageReference Include="AngleSharp" Version="1.0.0" />
<PackageReference Include="Polly" Version="8.0.0" />
<PackageReference Include="Serilog" Version="3.0.0" />
```

## 🔧 **Configuración**

### **1. appsettings.json**
```json
{
  "Scraping": {
    "Enabled": true,
    "UserAgent": "MangaCount/1.0 (https://github.com/Lubonch/MangaCount)",
    "DelayBetweenRequests": 2000,
    "MaxRetries": 3,
    "TimeoutSeconds": 30,
    "RespectRobotsTxt": true,
    "RateLimitRequestsPerMinute": 30,
    "HeadlessBrowser": true,
    "BrowserPath": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  },
  "Publishers": {
    "Ivrea": {
      "BaseUrl": "https://www.ivrea.com.ar",
      "CatalogUrl": "https://www.ivrea.com.ar/catalogo",
      "Enabled": true
    },
    "Panini": {
      "BaseUrl": "https://www.panini.com.ar",
      "CatalogUrl": "https://www.panini.com.ar/manga",
      "Enabled": true
    },
    "OvniPress": {
      "BaseUrl": "https://www.ovnipress.net",
      "CatalogUrl": "https://www.ovnipress.net/catalogo",
      "Enabled": true
    },
    "VizMedia": {
      "BaseUrl": "https://www.viz.com",
      "CatalogUrl": "https://www.viz.com/shonenjump",
      "Enabled": false
    }
  }
}
```

## 📋 **Estrategias de Scraping por Publisher**

### **1. Patrón Strategy**
```csharp
public interface IPublisherScrapingStrategy
{
    string PublisherName { get; }
    Task<ScrapingResult> ScrapeCatalogAsync();
    Task<ScrapedManga> ScrapeMangaDetailsAsync(string mangaUrl);
    bool CanHandleUrl(string url);
}
```

### **2. Factory Pattern**
```csharp
public class PublisherScrapingFactory
{
    private readonly Dictionary<string, IPublisherScrapingStrategy> _strategies;

    public PublisherScrapingFactory(
        IvreaScrapingStrategy ivreaStrategy,
        PaniniScrapingStrategy paniniStrategy,
        OvniPressScrapingStrategy ovniStrategy,
        VizMediaScrapingStrategy vizStrategy)
    {
        _strategies = new()
        {
            ["ivrea"] = ivreaStrategy,
            ["panini"] = paniniStrategy,
            ["ovnipress"] = ovniStrategy,
            ["viz"] = vizStrategy
        };
    }

    public IPublisherScrapingStrategy GetStrategy(string publisherName)
        => _strategies[publisherName.ToLowerInvariant()];
}
```

## 🔍 **Técnicas de Scraping**

### **1. HtmlAgilityPack (Estático)**
```csharp
public class HtmlScrapingService
{
    private readonly HttpClient _httpClient;

    public async Task<HtmlDocument> LoadPageAsync(string url)
    {
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var html = await response.Content.ReadAsStringAsync();
        var document = new HtmlDocument();
        document.LoadHtml(html);

        return document;
    }

    public IEnumerable<HtmlNode> SelectNodes(HtmlDocument document, string xpath)
        => document.DocumentNode.SelectNodes(xpath) ?? Enumerable.Empty<HtmlNode>();
}
```

### **2. PuppeteerSharp (Dinámico)**
```csharp
public class BrowserScrapingService
{
    private readonly IBrowser _browser;

    public async Task<string> GetDynamicContentAsync(string url)
    {
        await using var page = await _browser.NewPageAsync();
        await page.GoToAsync(url, WaitUntilNavigation.Networkidle0);

        // Wait for dynamic content to load
        await page.WaitForSelectorAsync(".manga-item");

        return await page.GetContentAsync();
    }
}
```

### **3. AngleSharp (Moderno)**
```csharp
public class AngleSharpScrapingService
{
    private readonly IBrowsingContext _context;

    public async Task<IDocument> LoadDocumentAsync(string url)
    {
        var config = Configuration.Default.WithDefaultLoader();
        _context = BrowsingContext.New(config);

        return await _context.OpenAsync(url);
    }
}
```

## 🗂️ **Modelos de Datos**

### **1. ScrapedManga**
```csharp
public class ScrapedManga
{
    public string Title { get; set; }
    public string? OriginalTitle { get; set; }
    public string? Description { get; set; }
    public string? Isbn { get; set; }
    public decimal? Price { get; set; }
    public string? Currency { get; set; }
    public DateTime? PublicationDate { get; set; }
    public int? PageCount { get; set; }
    public string? CoverUrl { get; set; }
    public List<string> Authors { get; set; }
    public List<string> Genres { get; set; }
    public string Publisher { get; set; }
    public string SourceUrl { get; set; }
    public DateTime ScrapedAt { get; set; }
    public ScrapingMetadata Metadata { get; set; }
}
```

### **2. ScrapingResult**
```csharp
public class ScrapingResult
{
    public bool Success { get; set; }
    public List<ScrapedManga> Mangas { get; set; }
    public List<string> Errors { get; set; }
    public ScrapingMetadata Metadata { get; set; }
    public TimeSpan Duration { get; set; }
}
```

### **3. ScrapingMetadata**
```csharp
public class ScrapingMetadata
{
    public string Publisher { get; set; }
    public string Strategy { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime CompletedAt { get; set; }
    public int TotalItems { get; set; }
    public int SuccessfulItems { get; set; }
    public int FailedItems { get; set; }
    public Dictionary<string, object> AdditionalData { get; set; }
}
```

## 🛡️ **Mejores Prácticas de Scraping**

### **1. Rate Limiting**
```csharp
public class RateLimiter
{
    private readonly SemaphoreSlim _semaphore;
    private readonly TimeSpan _delay;

    public RateLimiter(int requestsPerMinute)
    {
        _semaphore = new SemaphoreSlim(requestsPerMinute);
        _delay = TimeSpan.FromMinutes(1) / requestsPerMinute;
    }

    public async Task WaitAsync()
    {
        await _semaphore.WaitAsync();
        await Task.Delay(_delay);
        _semaphore.Release();
    }
}
```

### **2. User Agent Rotation**
```csharp
public class UserAgentRotator
{
    private readonly List<string> _userAgents = new()
    {
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    };

    public string GetRandomUserAgent()
        => _userAgents[new Random().Next(_userAgents.Count)];
}
```

### **3. Error Handling con Polly**
```csharp
public class ScrapingResiliencePolicy
{
    public static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
    {
        return Policy<HttpResponseMessage>
            .Handle<HttpRequestException>()
            .OrResult(r => !r.IsSuccessStatusCode)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (result, timeSpan, retryCount, context) =>
                {
                    _logger.LogWarning($"Request failed. Retry {retryCount} in {timeSpan.TotalSeconds}s");
                });
    }
}
```

## 🔄 **Flujo de Scraping**

### **1. Discovery Phase**
```csharp
public class CatalogDiscoveryService
{
    public async Task<List<string>> DiscoverMangaUrlsAsync(string catalogUrl)
    {
        var document = await _htmlService.LoadPageAsync(catalogUrl);

        // Extract pagination links
        var paginationUrls = ExtractPaginationUrls(document);

        // Extract manga URLs from current page
        var mangaUrls = ExtractMangaUrls(document);

        // Process all pages
        foreach (var pageUrl in paginationUrls)
        {
            var pageDocument = await _htmlService.LoadPageAsync(pageUrl);
            mangaUrls.AddRange(ExtractMangaUrls(pageDocument));
        }

        return mangaUrls.Distinct().ToList();
    }
}
```

### **2. Detail Extraction Phase**
```csharp
public class DetailExtractionService
{
    public async Task<ScrapedManga> ExtractMangaDetailsAsync(string mangaUrl)
    {
        var document = await _htmlService.LoadPageAsync(mangaUrl);

        return new ScrapedManga
        {
            Title = ExtractTitle(document),
            Description = ExtractDescription(document),
            Price = ExtractPrice(document),
            CoverUrl = ExtractCoverUrl(document),
            Authors = ExtractAuthors(document),
            Genres = ExtractGenres(document),
            Publisher = ExtractPublisher(document),
            SourceUrl = mangaUrl,
            ScrapedAt = DateTime.UtcNow
        };
    }
}
```

## 📊 **Monitoreo y Logging**

### **1. Structured Logging**
```csharp
public class ScrapingLogger
{
    private readonly ILogger _logger;

    public void LogScrapingStart(string publisher, int expectedItems)
    {
        _logger.LogInformation("Starting scraping for {Publisher}. Expected items: {Count}",
            publisher, expectedItems);
    }

    public void LogScrapingProgress(string publisher, int processed, int total)
    {
        _logger.LogInformation("Scraping progress for {Publisher}: {Processed}/{Total}",
            publisher, processed, total);
    }

    public void LogScrapingError(string publisher, string url, Exception ex)
    {
        _logger.LogError(ex, "Error scraping {Url} for {Publisher}", url, publisher);
    }
}
```

### **2. Métricas**
```csharp
public class ScrapingMetrics
{
    private readonly Counter _scrapingRequests;
    private readonly Histogram _scrapingDuration;
    private readonly Counter _scrapingErrors;

    public ScrapingMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("MangaCount.Scraping");

        _scrapingRequests = meter.CreateCounter<int>("scraping_requests_total");
        _scrapingDuration = meter.CreateHistogram<double>("scraping_duration_seconds");
        _scrapingErrors = meter.CreateCounter<int>("scraping_errors_total");
    }
}
```

## 🚨 **Manejo de Errores**

### **1. Tipos de Error Comunes**
- **429 Too Many Requests**: Implementar backoff
- **403 Forbidden**: Cambiar User-Agent o IP
- **404 Not Found**: URL obsoleta, remover del catálogo
- **500 Server Error**: Retry con delay
- **Timeout**: Aumentar timeout o usar browser dinámico

### **2. Circuit Breaker**
```csharp
public class ScrapingCircuitBreaker
{
    private readonly CircuitBreakerPolicy _circuitBreaker;

    public ScrapingCircuitBreaker()
    {
        _circuitBreaker = Policy
            .Handle<Exception>()
            .CircuitBreakerAsync(
                exceptionsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromMinutes(5),
                onBreak: (ex, breakDelay) =>
                {
                    _logger.LogWarning("Circuit breaker opened for scraping");
                },
                onReset: () =>
                {
                    _logger.LogInformation("Circuit breaker reset for scraping");
                });
    }
}
```

## 🔄 **Sincronización y Cache**

### **1. Cache Strategy**
```csharp
public class ScrapingCacheService
{
    public async Task<ScrapedManga?> GetCachedMangaAsync(string url)
    {
        var cacheKey = $"scraping:manga:{HashUrl(url)}";
        return await _cache.GetAsync<ScrapedManga>(cacheKey);
    }

    public async Task SetCachedMangaAsync(string url, ScrapedManga manga, TimeSpan ttl)
    {
        var cacheKey = $"scraping:manga:{HashUrl(url)}";
        await _cache.SetAsync(cacheKey, manga, ttl);
    }
}
```

### **2. Incremental Sync**
```csharp
public class IncrementalSyncService
{
    public async Task<SyncResult> SyncPublisherAsync(string publisher)
    {
        var lastSync = await GetLastSyncTimestampAsync(publisher);
        var newOrUpdatedItems = await GetItemsModifiedSinceAsync(publisher, lastSync);

        // Process only changed items
        foreach (var item in newOrUpdatedItems)
        {
            await ProcessItemAsync(item);
        }

        await UpdateLastSyncTimestampAsync(publisher);
    }
}
```

## 🧪 **Testing Strategy**

### **1. Unit Tests**
```csharp
[Test]
public void ExtractTitle_ValidHtml_ReturnsTitle()
{
    // Arrange
    var html = "<html><title>Test Manga</title></html>";
    var document = new HtmlDocument();
    document.LoadHtml(html);

    // Act
    var result = _extractor.ExtractTitle(document);

    // Assert
    result.Should().Be("Test Manga");
}
```

### **2. Integration Tests**
```csharp
[Test]
public async Task ScrapeIvreaCatalog_ReturnsValidMangas()
{
    // Arrange
    var strategy = new IvreaScrapingStrategy(_httpClient, _settings);

    // Act
    var result = await strategy.ScrapeCatalogAsync();

    // Assert
    result.Success.Should().BeTrue();
    result.Mangas.Should().NotBeEmpty();
    result.Mangas.Should().AllSatisfy(m => m.Publisher.Should().Be("Ivrea"));
}
```

### **3. Mock Data para Testing**
```csharp
public class ScrapingTestData
{
    public static HtmlDocument CreateMockIvreaPage()
    {
        var html = @"
        <html>
        <body>
            <div class='product-item'>
                <h2>One Piece Vol. 1</h2>
                <div class='price'>$500</div>
                <img src='cover.jpg' />
            </div>
        </body>
        </html>";

        var document = new HtmlDocument();
        document.LoadHtml(html);
        return document;
    }
}
```

## 📈 **Escalabilidad**

### **1. Distributed Scraping**
```csharp
public class DistributedScrapingService
{
    // Usar Hangfire o similar para distributed jobs
    // Queue scraping tasks
    // Monitor progress across multiple instances
}
```

### **2. Proxy Rotation**
```csharp
public class ProxyRotator
{
    private readonly List<string> _proxies;

    public string GetNextProxy()
    {
        // Rotate through proxy list
        // Handle proxy failures
        // Monitor proxy performance
    }
}
```

## ⚖️ **Consideraciones Legales**

### **1. Robots.txt Compliance**
```csharp
public class RobotsTxtChecker
{
    public async Task<bool> IsAllowedAsync(string url, string userAgent)
    {
        var robotsUrl = GetRobotsTxtUrl(url);
        var robotsContent = await _httpClient.GetStringAsync(robotsUrl);

        // Parse robots.txt and check if scraping is allowed
        return ParseRobotsTxt(robotsContent, userAgent);
    }
}
```

### **2. Rate Limiting Respect**
```csharp
public class PoliteScrapingService
{
    // Always respect robots.txt
    // Implement reasonable delays
    // Don't overwhelm servers
    // Provide contact information in User-Agent
}
```

---

## 🎯 **Checklist de Implementación**

### **Fase 1: Core Infrastructure** ✅
- [ ] Configurar HttpClient con headers apropiados
- [ ] Implementar rate limiting básico
- [ ] Crear modelos de datos base
- [ ] Setup de logging estructurado

### **Fase 2: Publisher Strategies** 🔄
- [ ] Implementar IvreaScrapingStrategy
- [ ] Implementar PaniniScrapingStrategy
- [ ] Implementar OvniPressScrapingStrategy
- [ ] Implementar VizMediaScrapingStrategy

### **Fase 3: Advanced Features** ⏳
- [ ] Circuit breaker pattern
- [ ] Cache inteligente
- [ ] Incremental sync
- [ ] Error recovery automático

### **Fase 4: Production Ready** 📅
- [ ] Testing completo con mocks
- [ ] Monitoreo y alertas
- [ ] Documentación de estrategias
- [ ] Performance optimization

### **Fase 5: Maintenance** 🔄
- [ ] Monitoring de cambios en websites
- [ ] Auto-adaptation a cambios de layout
- [ ] Proxy rotation para escalabilidad
- [ ] Legal compliance monitoring</content>
<parameter name="filePath">c:\repos\MangaCount\WEB_SCRAPING_BIBLE.md
