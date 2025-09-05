# 📖 Biblia de Publisher: Viz Media

## 🎯 **Visión General**

Viz Media es el publisher más grande de manga en el mundo, con presencia global y derechos de series icónicas como Naruto, One Piece, Death Note, etc. Aunque su sitio web oficial no tiene API pública, es un objetivo importante para scraping.

## 🌐 **Análisis del Sitio Web**

### **1. URL Base**
- **Sitio Principal**: `https://www.viz.com`
- **Shonen Jump**: `https://www.viz.com/shonenjump`
- **Catálogo Manga**: `https://www.viz.com/read/manga`
- **Buscar**: `https://www.viz.com/search`

### **2. Estructura del Sitio**
```
viz.com/
├── shonenjump/                 # Shonen Jump digital
├── read/                       # Lectura digital
│   ├── manga/                  # Catálogo de manga
│   └── [series-slug]/          # Páginas de series
├── buy/                        # Tienda física/digital
├── search/                     # Búsqueda
└── [manga-slug]/               # Páginas individuales
```

### **3. Tecnologías Detectadas**
- **Framework**: React.js con Next.js
- **API**: API interna GraphQL/REST
- **JavaScript**: JavaScript moderno con módulos
- **Imágenes**: CDN optimizado con diferentes tamaños
- **SEO**: Meta tags completos y schema.org

## 🔍 **Estrategia de Scraping**

### **1. Patrón de URLs**
```csharp
public class VizMediaUrlPatterns
{
    public const string BaseUrl = "https://www.viz.com";
    public const string ShonenJumpUrl = "https://www.viz.com/shonenjump";
    public const string MangaCatalogUrl = "https://www.viz.com/read/manga";
    public const string SearchUrl = "https://www.viz.com/search";

    public static string GetMangaUrl(string slug)
        => $"{BaseUrl}/{slug}";

    public static string GetSeriesUrl(string seriesSlug)
        => $"{BaseUrl}/read/manga/{seriesSlug}";

    public static string GetChapterUrl(string seriesSlug, string chapterNumber)
        => $"{BaseUrl}/read/manga/{seriesSlug}/chapter-{chapterNumber}";

    public static bool IsMangaUrl(string url)
        => url.Contains("/read/manga/") || url.StartsWith($"{BaseUrl}/") && !url.Contains("/shonenjump");

    public static bool IsShonenJumpUrl(string url)
        => url.Contains("/shonenjump");
}
```

### **2. Selectores CSS Principales**
```csharp
public class VizMediaSelectors
{
    // Catálogo - Lista de series
    public const string SeriesGrid = ".series-grid, [data-testid='series-grid']";
    public const string SeriesCard = ".series-card, [data-testid='series-card']";
    public const string SeriesLink = ".series-link, [data-testid='series-link']";
    public const string SeriesTitle = ".series-title, [data-testid='series-title']";
    public const string SeriesCover = ".series-cover img, [data-testid='series-cover'] img";

    // Paginación
    public const string Pagination = ".pagination, [data-testid='pagination']";
    public const string NextPage = ".next, [data-testid='next-page']";
    public const string LoadMore = ".load-more, [data-testid='load-more']";

    // Página de serie individual
    public const string SeriesTitleSingle = ".series-title, [data-testid='series-title']";
    public const string SeriesDescription = ".series-description, [data-testid='series-description']";
    public const string SeriesCoverSingle = ".series-cover img, [data-testid='series-cover']";
    public const string SeriesMetadata = ".series-metadata, [data-testid='series-metadata']";
    public const string ChapterList = ".chapter-list, [data-testid='chapter-list']";
    public const string ChapterItem = ".chapter-item, [data-testid='chapter-item']";

    // Información específica
    public const string AuthorSelector = ".author, [data-testid='author']";
    public const string PublisherSelector = ".publisher, [data-testid='publisher']";
    public const string PublicationDateSelector = ".publication-date, [data-testid='publication-date']";
    public const string GenreSelector = ".genre, [data-testid='genre']";
    public const string DemographicSelector = ".demographic, [data-testid='demographic']";

    // Shonen Jump
    public const string JumpChapterList = ".chapter-list, [data-testid='jump-chapter-list']";
    public const string JumpSeriesInfo = ".series-info, [data-testid='jump-series-info']";
}
```

## 📋 **Campos de Datos Disponibles**

### **1. Información Básica**
```csharp
public class VizMediaMangaData
{
    // Información de la serie
    public string Title { get; set; }              // Título del manga
    public string? OriginalTitle { get; set; }     // Título original japonés
    public string Slug { get; set; }               // Slug de la URL
    public string Url { get; set; }                // URL completa de la serie

    // Información editorial
    public List<string> Authors { get; set; }      // Autores (mangaka)
    public string Publisher { get; set; } = "Viz Media"; // Publisher
    public string? OriginalPublisher { get; set; } // Editorial original (Shueisha, etc.)
    public string? Demographic { get; set; }       // Demografía (shonen, seinen, etc.)
    public List<string> Genres { get; set; }       // Géneros
    public string? TargetAudience { get; set; }    // Audiencia objetivo

    // Contenido
    public string? Description { get; set; }       // Descripción de la serie
    public string? Synopsis { get; set; }          // Sinopsis
    public string? Status { get; set; }            // Estado (ongoing, completed, etc.)

    // Imágenes
    public string? CoverUrl { get; set; }          // URL de la carátula principal
    public List<string> GalleryUrls { get; set; }  // URLs de imágenes adicionales

    // Información de publicación
    public DateTime? StartDate { get; set; }       // Fecha de inicio de publicación
    public DateTime? EndDate { get; set; }         // Fecha de finalización
    public int? TotalVolumes { get; set; }         // Número total de volúmenes
    public int? TotalChapters { get; set; }        // Número total de capítulos

    // Metadatos de scraping
    public DateTime ScrapedAt { get; set; }        // Fecha del scraping
    public string ScrapingSource { get; set; } = "Viz Media";
}
```

### **2. Información Específica de Volúmenes/Capítulos**
```csharp
public class VizMediaVolumeData
{
    // Información del volumen
    public string SeriesTitle { get; set; }        // Título de la serie
    public int VolumeNumber { get; set; }          // Número de volumen
    public string? Isbn { get; set; }              // ISBN del volumen
    public string? Isbn13 { get; set; }            // ISBN-13
    public DateTime? PublicationDate { get; set; } // Fecha de publicación
    public int? PageCount { get; set; }            // Número de páginas
    public string? Format { get; set; }            // Formato

    // Precios
    public decimal? Price { get; set; }            // Precio
    public string Currency { get; set; } = "USD";  // Moneda

    // Imágenes
    public string? CoverUrl { get; set; }          // URL de la carátula del volumen

    // Contenido
    public List<int> ChapterNumbers { get; set; }  // Números de capítulos incluidos
    public string? VolumeTitle { get; set; }       // Título específico del volumen

    // Estado
    public bool IsAvailable { get; set; }          // Disponibilidad
    public string? StockStatus { get; set; }       // Estado del stock
}
```

### **3. Información de Shonen Jump**
```csharp
public class VizMediaShonenJumpData
{
    // Información de Shonen Jump
    public string SeriesTitle { get; set; }        // Título de la serie
    public string? JumpSlug { get; set; }          // Slug en Shonen Jump
    public string? JumpUrl { get; set; }           // URL en Shonen Jump

    // Estado de serialización
    public bool IsSerialized { get; set; }         // Si está serializándose
    public DateTime? LastUpdate { get; set; }      // Última actualización
    public int? LatestChapter { get; set; }        // Último capítulo disponible

    // Información semanal
    public string? SerializationDay { get; set; }  // Día de serialización
    public string? SerializationStatus { get; set; } // Estado de serialización

    // Estadísticas
    public int? WeeklyRank { get; set; }           // Ranking semanal
    public double? Rating { get; set; }            // Calificación
    public int? Views { get; set; }                // Número de vistas
}
```

## 🔍 **Algoritmos de Extracción**

### **1. Extracción del Catálogo**
```csharp
public class VizMediaCatalogExtractor
{
    public async Task<List<VizMediaMangaData>> ExtractCatalogAsync(string catalogUrl)
    {
        var mangas = new List<VizMediaMangaData>();
        var currentUrl = catalogUrl;
        var page = 1;

        while (currentUrl != null && page <= _settings.MaxPages)
        {
            var document = await _htmlService.LoadPageAsync(currentUrl);
            var pageMangas = await ExtractMangasFromPageAsync(document);
            mangas.AddRange(pageMangas);

            currentUrl = await ExtractNextPageUrlAsync(document, page);
            page++;

            // Rate limiting
            await Task.Delay(_settings.DelayBetweenRequests);
        }

        return mangas;
    }

    private async Task<List<VizMediaMangaData>> ExtractMangasFromPageAsync(HtmlDocument document)
    {
        var seriesNodes = document.DocumentNode.SelectNodes(VizMediaSelectors.SeriesCard);
        var mangas = new List<VizMediaMangaData>();

        foreach (var seriesNode in seriesNodes)
        {
            try
            {
                var manga = await ExtractBasicMangaDataAsync(seriesNode);
                if (manga != null)
                {
                    mangas.Add(manga);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting manga from catalog");
            }
        }

        return mangas;
    }

    private async Task<VizMediaMangaData?> ExtractBasicMangaDataAsync(HtmlNode seriesNode)
    {
        var linkNode = seriesNode.SelectSingleNode(VizMediaSelectors.SeriesLink);
        if (linkNode == null) return null;

        var url = linkNode.GetAttributeValue("href", "");
        if (string.IsNullOrEmpty(url)) return null;

        var titleNode = seriesNode.SelectSingleNode(VizMediaSelectors.SeriesTitle);
        if (titleNode == null) return null;

        var manga = new VizMediaMangaData
        {
            Title = titleNode.InnerText.Trim(),
            Url = url,
            Slug = ExtractSlugFromUrl(url),
            ScrapedAt = DateTime.UtcNow
        };

        // Extraer imagen
        var imageNode = seriesNode.SelectSingleNode(VizMediaSelectors.SeriesCover);
        if (imageNode != null)
        {
            manga.CoverUrl = imageNode.GetAttributeValue("src", "");
        }

        return manga;
    }
}
```

### **2. Extracción de Detalles Individuales**
```csharp
public class VizMediaDetailExtractor
{
    public async Task<VizMediaMangaData> ExtractDetailedMangaAsync(string seriesUrl)
    {
        var document = await _htmlService.LoadPageAsync(seriesUrl);

        var manga = new VizMediaMangaData
        {
            Url = seriesUrl,
            Slug = ExtractSlugFromUrl(seriesUrl),
            ScrapedAt = DateTime.UtcNow
        };

        // Extraer información básica
        manga.Title = ExtractTitle(document);
        manga.Description = ExtractDescription(document);
        manga.CoverUrl = ExtractCoverUrl(document);

        // Extraer metadatos
        manga.Authors = ExtractAuthors(document);
        manga.Genres = ExtractGenres(document);
        manga.Demographic = ExtractDemographic(document);
        manga.Status = ExtractStatus(document);

        // Extraer información de publicación
        var publicationInfo = ExtractPublicationInfo(document);
        manga.StartDate = publicationInfo.startDate;
        manga.EndDate = publicationInfo.endDate;
        manga.TotalVolumes = publicationInfo.totalVolumes;
        manga.TotalChapters = publicationInfo.totalChapters;

        // Extraer información de Shonen Jump si está disponible
        var jumpData = await ExtractShonenJumpDataAsync(manga.Slug);
        if (jumpData != null)
        {
            // Mapear datos de Jump al manga principal
        }

        return manga;
    }
}
```

### **3. Extracción de Metadatos Especiales**
```csharp
public class VizMediaMetadataExtractor
{
    public List<string> ExtractAuthors(HtmlDocument document)
    {
        var authors = new List<string>();

        // Buscar en metadatos
        var authorNodes = document.DocumentNode.SelectNodes(VizMediaSelectors.AuthorSelector);
        if (authorNodes != null)
        {
            authors.AddRange(authorNodes.Select(n => n.InnerText.Trim()));
        }

        // Buscar en JSON-LD schema
        var jsonLdScripts = document.DocumentNode.SelectNodes("//script[@type='application/ld+json']");
        if (jsonLdScripts != null)
        {
            foreach (var script in jsonLdScripts)
            {
                authors.AddRange(ExtractAuthorsFromJsonLd(script.InnerText));
            }
        }

        // Buscar en texto de la página
        var content = document.DocumentNode.InnerText;
        authors.AddRange(ExtractAuthorsFromText(content));

        return authors.Distinct().ToList();
    }

    public List<string> ExtractGenres(HtmlDocument document)
    {
        var genres = new List<string>();

        var genreNodes = document.DocumentNode.SelectNodes(VizMediaSelectors.GenreSelector);
        if (genreNodes != null)
        {
            genres.AddRange(genreNodes.Select(n => n.InnerText.Trim()));
        }

        return genres;
    }

    public string? ExtractDemographic(HtmlDocument document)
    {
        var demographicNode = document.DocumentNode.SelectSingleNode(VizMediaSelectors.DemographicSelector);
        return demographicNode?.InnerText?.Trim();
    }

    public string? ExtractStatus(HtmlDocument document)
    {
        // Buscar indicadores de estado
        var content = document.DocumentNode.InnerText;

        if (content.Contains("ongoing", StringComparison.OrdinalIgnoreCase) ||
            content.Contains("serializing", StringComparison.OrdinalIgnoreCase))
        {
            return "Ongoing";
        }

        if (content.Contains("completed", StringComparison.OrdinalIgnoreCase) ||
            content.Contains("finished", StringComparison.OrdinalIgnoreCase))
        {
            return "Completed";
        }

        if (content.Contains("cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return "Cancelled";
        }

        return "Unknown";
    }
}
```

## 🔄 **Manejo de Paginación**

### **1. Sistema de Paginación de Viz**
```csharp
public class VizMediaPaginationHandler
{
    public async Task<string?> ExtractNextPageUrlAsync(HtmlDocument document, int currentPage)
    {
        // Verificar si hay botón "Load More"
        var loadMoreButton = document.DocumentNode.SelectSingleNode(VizMediaSelectors.LoadMore);
        if (loadMoreButton != null)
        {
            // Para carga infinita, construir URL con offset
            return $"{VizMediaUrlPatterns.MangaCatalogUrl}?page={currentPage + 1}";
        }

        // Verificar paginación tradicional
        var nextLink = document.DocumentNode.SelectSingleNode(VizMediaSelectors.NextPage);
        if (nextLink != null)
        {
            var href = nextLink.GetAttributeValue("href", "");
            return string.IsNullOrEmpty(href) ? null : href;
        }

        return null;
    }

    public bool HasMorePages(HtmlDocument document)
    {
        // Verificar si hay más contenido para cargar
        var loadMore = document.DocumentNode.SelectSingleNode(VizMediaSelectors.LoadMore);
        if (loadMore != null && !loadMore.HasClass("disabled"))
        {
            return true;
        }

        var nextPage = document.DocumentNode.SelectSingleNode(VizMediaSelectors.NextPage);
        return nextPage != null;
    }
}
```

## 🖼️ **Manejo de Imágenes**

### **1. Extracción de Carátulas**
```csharp
public class VizMediaImageExtractor
{
    public string? ExtractCoverUrl(HtmlDocument document)
    {
        // Buscar imagen principal
        var mainImage = document.DocumentNode.SelectSingleNode(VizMediaSelectors.SeriesCoverSingle);
        if (mainImage != null)
        {
            var src = mainImage.GetAttributeValue("src", "");
            if (!string.IsNullOrEmpty(src))
            {
                return ConvertToHighResUrl(src);
            }
        }

        // Buscar en meta tags
        var metaImage = document.DocumentNode.SelectSingleNode("meta[property='og:image']");
        if (metaImage != null)
        {
            var content = metaImage.GetAttributeValue("content", "");
            if (!string.IsNullOrEmpty(content))
            {
                return content;
            }
        }

        return null;
    }

    public List<string> ExtractGalleryUrls(HtmlDocument document)
    {
        var galleryUrls = new List<string>();

        // Buscar imágenes adicionales en la galería
        var galleryImages = document.DocumentNode.SelectNodes(".gallery img, .additional-images img");
        if (galleryImages != null)
        {
            foreach (var img in galleryImages)
            {
                var src = img.GetAttributeValue("src", "");
                if (!string.IsNullOrEmpty(src))
                {
                    galleryUrls.Add(ConvertToHighResUrl(src));
                }
            }
        }

        return galleryUrls;
    }

    private string ConvertToHighResUrl(string imageUrl)
    {
        // Viz usa diferentes tamaños de imagen
        // Convertir thumbnails a full resolution
        return imageUrl.Replace("_thumb", "")
                      .Replace("_small", "")
                      .Replace("_medium", "");
    }
}
```

## 📊 **Patrones de Contenido**

### **1. Patrones de Título**
```csharp
public class VizMediaTitlePatterns
{
    private static readonly Regex VolumePattern = new(@"(.+?)\s+(?:Vol\.?|Volume)\s*(\d+)", RegexOptions.IgnoreCase);
    private static readonly Regex ChapterPattern = new(@"(.+?)\s+(?:Chapter|Ch\.?)\s*(\d+)", RegexOptions.IgnoreCase);

    public static (string title, int? volume) ParseTitle(string fullTitle)
    {
        var volumeMatch = VolumePattern.Match(fullTitle);
        if (volumeMatch.Success)
        {
            var title = volumeMatch.Groups[1].Value.Trim();
            var volume = int.Parse(volumeMatch.Groups[2].Value);
            return (title, volume);
        }

        return (fullTitle, null);
    }
}
```

### **2. Patrones de Descripción**
```csharp
public class VizMediaDescriptionPatterns
{
    public static List<string> ExtractAuthorsFromDescription(string description)
    {
        var authorPatterns = new[]
        {
            @"by\s+([^;\n]+)",
            @"written by\s+([^;\n]+)",
            @"story by\s+([^;\n]+)",
            @"author\s*:\s*([^;\n]+)"
        };

        var authors = new List<string>();

        foreach (var pattern in authorPatterns)
        {
            var matches = Regex.Matches(description, pattern, RegexOptions.IgnoreCase);
            foreach (Match match in matches)
            {
                var authorText = match.Groups[1].Value.Trim();
                authors.AddRange(SplitAuthors(authorText));
            }
        }

        return authors.Distinct().ToList();
    }

    private static IEnumerable<string> SplitAuthors(string authorText)
    {
        // Manejar separadores comunes en inglés
        return authorText.Split(new[] { ",", " and ", " & " }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(a => a.Trim());
    }
}
```

## 🚨 **Manejo de Errores y Edge Cases**

### **1. Contenido No Disponible**
```csharp
public class VizMediaErrorHandler
{
    public bool IsContentAvailable(HtmlDocument document)
    {
        // Buscar mensajes de error
        var errorMessages = new[]
        {
            "not available",
            "coming soon",
            "not found",
            "unavailable"
        };

        var content = document.DocumentNode.InnerText.ToLowerInvariant();

        foreach (var error in errorMessages)
        {
            if (content.Contains(error))
            {
                return false;
            }
        }

        // Verificar si hay contenido mínimo
        var title = document.DocumentNode.SelectSingleNode(VizMediaSelectors.SeriesTitleSingle);
        var description = document.DocumentNode.SelectSingleNode(VizMediaSelectors.SeriesDescription);

        return title != null && description != null;
    }

    public string? GetAvailabilityStatus(HtmlDocument document)
    {
        var content = document.DocumentNode.InnerText.ToLowerInvariant();

        if (content.Contains("coming soon"))
            return "Coming Soon";

        if (content.Contains("not available"))
            return "Not Available";

        if (content.Contains("cancelled"))
            return "Cancelled";

        return "Available";
    }
}
```

### **2. Contenido Dinámico con JavaScript**
```csharp
public class VizMediaDynamicContentHandler
{
    public async Task<HtmlDocument> LoadDynamicContentAsync(string url)
    {
        // Viz usa React, por lo que mucho contenido se carga dinámicamente
        // Usar Puppeteer para renderizar completamente

        return await _browserService.LoadPageAsync(url);
    }

    public async Task<string> ExtractJsonDataAsync(string url)
    {
        // Intentar extraer datos JSON de la página
        var document = await _htmlService.LoadPageAsync(url);

        // Buscar scripts que contengan datos JSON
        var scripts = document.DocumentNode.SelectNodes("//script[contains(text(), 'window.__INITIAL_STATE__') or contains(text(), '__NEXT_DATA__')]");

        if (scripts != null)
        {
            foreach (var script in scripts)
            {
                // Extraer y parsear datos JSON
                var jsonData = ExtractJsonFromScript(script.InnerText);
                if (!string.IsNullOrEmpty(jsonData))
                {
                    return jsonData;
                }
            }
        }

        return string.Empty;
    }
}
```

## 📈 **Métricas de Calidad**

### **1. Métricas de Extracción**
```csharp
public class VizMediaExtractionMetrics
{
    public int TotalSeries { get; set; }
    public int SuccessfullyExtracted { get; set; }
    public int FailedExtractions { get; set; }
    public double SuccessRate => TotalSeries > 0 ? (double)SuccessfullyExtracted / TotalSeries : 0;

    public Dictionary<string, int> FailureReasons { get; set; } = new();
    public TimeSpan AverageExtractionTime { get; set; }
    public Dictionary<string, int> DataCompleteness { get; set; } = new();

    // Métricas específicas de Viz
    public int OngoingSeries { get; set; }
    public int CompletedSeries { get; set; }
    public int ShonenJumpSeries { get; set; }
    public int LicensedSeries { get; set; }
}
```

### **2. Validación de Datos**
```csharp
public class VizMediaDataValidator
{
    public List<string> ValidateMangaData(VizMediaMangaData manga)
    {
        var errors = new List<string>();

        if (string.IsNullOrEmpty(manga.Title))
            errors.Add("Título faltante");

        if (string.IsNullOrEmpty(manga.Url))
            errors.Add("URL faltante");

        if (manga.StartDate > DateTime.Now)
            errors.Add("Fecha de inicio futura");

        if (manga.EndDate.HasValue && manga.EndDate > DateTime.Now)
            errors.Add("Fecha de fin futura");

        if (manga.TotalVolumes < 0)
            errors.Add("Número de volúmenes negativo");

        if (manga.TotalChapters < 0)
            errors.Add("Número de capítulos negativo");

        return errors;
    }
}
```

## 🔄 **Estrategia de Sincronización**

### **1. Detección de Cambios**
```csharp
public class VizMediaChangeDetector
{
    public async Task<List<string>> DetectNewOrUpdatedSeriesAsync()
    {
        // Estrategia 1: Verificar página de "New Releases"
        var newReleases = await DetectNewReleasesAsync();

        // Estrategia 2: Verificar cambios en series conocidas
        var updatedSeries = await DetectUpdatedSeriesAsync();

        // Estrategia 3: Verificar Shonen Jump updates
        var jumpUpdates = await DetectShonenJumpUpdatesAsync();

        return newReleases.Concat(updatedSeries).Concat(jumpUpdates).Distinct().ToList();
    }

    private async Task<List<string>> DetectNewReleasesAsync()
    {
        var newReleasesUrl = "https://www.viz.com/new-releases";
        var document = await _htmlService.LoadPageAsync(newReleasesUrl);

        var seriesLinks = document.DocumentNode.SelectNodes(".series-link");
        return seriesLinks?.Select(link => link.GetAttributeValue("href", ""))
                          .Where(href => !string.IsNullOrEmpty(href))
                          .ToList() ?? new List<string>();
    }

    private async Task<List<string>> DetectShonenJumpUpdatesAsync()
    {
        var jumpUrl = "https://www.viz.com/shonenjump";
        var document = await _browserService.LoadPageAsync(jumpUrl);

        // Extraer series con actualizaciones recientes
        var updatedSeries = document.DocumentNode.SelectNodes(".recently-updated");
        return updatedSeries?.Select(node => node.GetAttributeValue("href", ""))
                           .Where(href => !string.IsNullOrEmpty(href))
                           .ToList() ?? new List<string>();
    }
}
```

### **2. Sync Incremental**
```csharp
public class VizMediaIncrementalSync
{
    public async Task SyncAsync()
    {
        // 1. Obtener series nuevas o modificadas
        var changedUrls = await _changeDetector.DetectNewOrUpdatedSeriesAsync();

        // 2. Procesar series en lotes para no sobrecargar
        var batches = changedUrls.Chunk(5);

        foreach (var batch in batches)
        {
            var tasks = batch.Select(url => ProcessSeriesAsync(url));
            await Task.WhenAll(tasks);

            // Delay entre lotes
            await Task.Delay(2000);
        }

        // 3. Actualizar métricas
        await UpdateSyncMetricsAsync();
    }

    private async Task ProcessSeriesAsync(string url)
    {
        try
        {
            var manga = await _detailExtractor.ExtractDetailedMangaAsync(url);
            await SaveOrUpdateMangaAsync(manga);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing series {Url}", url);
            await MarkSeriesAsFailedAsync(url, ex.Message);
        }
    }
}
```

## 🎯 **Checklist Específico de Viz Media**

### **Fase 1: Análisis del Sitio** ✅
- [x] Mapear estructura del sitio
- [x] Identificar selectores CSS principales
- [x] Documentar patrones de URL
- [x] Analizar tecnologías utilizadas

### **Fase 2: Extracción Básica** 🔄
- [ ] Implementar extracción del catálogo
- [ ] Extraer información básica de series
- [ ] Manejar paginación infinita
- [ ] Implementar rate limiting agresivo

### **Fase 3: Extracción Avanzada** ⏳
- [ ] Extraer detalles individuales de series
- [ ] Manejar contenido dinámico con React
- [ ] Implementar validación de datos
- [ ] Extraer metadatos de Shonen Jump

### **Fase 4: Optimización** 📅
- [ ] Implementar cache inteligente
- [ ] Sync incremental eficiente
- [ ] Monitoreo de cambios automatizado
- [ ] Error recovery para contenido dinámico

### **Fase 5: Producción** 🔄
- [ ] Testing exhaustivo con contenido dinámico
- [ ] Monitoreo de performance
- [ ] Alertas de calidad de datos
- [ ] Documentación de mantenimiento avanzado

---

## ⚠️ **Consideraciones Especiales para Viz Media**

### **1. Rate Limiting Muy Estricto**
Viz Media tiene protección muy agresiva contra scraping:
- **Delay mínimo**: 3-5 segundos entre requests
- **Máximo requests por hora**: 100-200
- **Uso de proxies**: Altamente recomendado
- **Rotación de User-Agents**: Esencial

### **2. Contenido Dinámico Complejo**
- **React.js/Next.js**: Requiere browser automation
- **API interna**: Posible extracción de datos JSON
- **Infinite scrolling**: Manejo especial de paginación
- **Lazy loading**: Contenido se carga bajo demanda

### **3. Legal y Ético**
- **Términos de servicio**: Muy restrictivos
- **Contenido premium**: No scrapear contenido pago
- **Atribución**: Siempre dar crédito apropiado
- **Alternativas**: Considerar APIs oficiales cuando estén disponibles

### **4. Escalabilidad**
- **Proxies**: Esencial para operación a escala
- **Distribución**: Posible necesidad de múltiples instancias
- **Cache agresivo**: Minimizar requests repetidos
- **Monitoreo constante**: Cambios frecuentes en el sitio</content>
<parameter name="filePath">c:\repos\MangaCount\VIZ_MEDIA_PUBLISHER_BIBLE.md
