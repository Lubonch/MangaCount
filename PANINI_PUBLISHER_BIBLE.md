# 📖 Biblia de Publisher: Panini Argentina

## 🎯 **Visión General**

Panini Argentina es uno de los publishers más grandes de Latinoamérica, con presencia en múltiples países. Publica manga japonés, cómics europeos y americanos, con un enfoque especial en series populares.

## 🌐 **Análisis del Sitio Web**

### **1. URL Base**
- **Sitio Principal**: `https://www.panini.com.ar`
- **Catálogo Manga**: `https://www.panini.com.ar/manga`
- **Novedades**: `https://www.panini.com.ar/novedades`

### **2. Estructura del Sitio**
```
panini.com.ar/
├── manga/                      # Catálogo de manga
│   ├── [serie]/                # Páginas específicas de series
│   └── novedades/              # Novedades de manga
├── comics/                     # Cómics americanos
├── graphic-novels/             # Novelas gráficas
├── producto/[id]/              # Página individual de producto
└── busqueda/                   # Sistema de búsqueda
```

### **3. Tecnologías Detectadas**
- **CMS**: Sistema propietario de Panini
- **Frontend**: JavaScript moderno con frameworks
- **API**: Posible API interna para productos
- **Imágenes**: CDN para carátulas optimizado
- **SEO**: Meta tags completos para productos

## 🔍 **Estrategia de Scraping**

### **1. Patrón de URLs**
```csharp
public class PaniniUrlPatterns
{
    public const string BaseUrl = "https://www.panini.com.ar";
    public const string MangaCatalogUrl = "https://www.panini.com.ar/manga";
    public const string ComicsCatalogUrl = "https://www.panini.com.ar/comics";
    public const string GraphicNovelsUrl = "https://www.panini.com.ar/graphic-novels";

    public static string GetProductUrl(string productId)
        => $"{BaseUrl}/producto/{productId}";

    public static string GetSeriesUrl(string seriesSlug)
        => $"{BaseUrl}/manga/{seriesSlug}";

    public static bool IsProductUrl(string url)
        => url.Contains("/producto/");

    public static bool IsMangaUrl(string url)
        => url.Contains("/manga/") && !url.Contains("/producto/");
}
```

### **2. Selectores CSS Principales**
```csharp
public class PaniniSelectors
{
    // Catálogo - Lista de productos
    public const string ProductGrid = ".product-grid, .products-container";
    public const string ProductCard = ".product-card, .product-item";
    public const string ProductLink = ".product-link, .product-card a";
    public const string ProductTitle = ".product-title, .product-name";
    public const string ProductPrice = ".product-price, .price";
    public const string ProductImage = ".product-image img, .product-cover img";

    // Paginación
    public const string Pagination = ".pagination, .page-navigation";
    public const string NextPage = ".next, .pagination-next";
    public const string PageNumbers = ".page-number, .pagination-link";

    // Página de producto individual
    public const string SingleProductTitle = ".product-title, h1";
    public const string SingleProductPrice = ".product-price, .price";
    public const string SingleProductDescription = ".product-description, .description";
    public const string SingleProductDetails = ".product-details, .details";
    public const string SingleProductImage = ".product-image img, .main-image img";
    public const string SingleProductGallery = ".product-gallery img";

    // Información específica
    public const string IsbnSelector = ".isbn, [data-isbn]";
    public const string AuthorSelector = ".author, [data-author]";
    public const string PublisherSelector = ".publisher, [data-publisher]";
    public const string PublicationDateSelector = ".publication-date, [data-publication-date]";
    public const string PageCountSelector = ".page-count, [data-page-count]";
    public const string FormatSelector = ".format, [data-format]";

    // Metadatos adicionales
    public const string SeriesSelector = ".series, [data-series]";
    public const string VolumeSelector = ".volume, [data-volume]";
    public const string GenreSelector = ".genre, [data-genre]";
}
```

## 📋 **Campos de Datos Disponibles**

### **1. Información Básica**
```csharp
public class PaniniMangaData
{
    // Información del producto
    public string Title { get; set; }              // Título del manga/cómic
    public string? OriginalTitle { get; set; }     // Título original
    public string ProductId { get; set; }          // ID interno de Panini
    public string Url { get; set; }                // URL completa del producto

    // Precios
    public decimal? Price { get; set; }            // Precio actual
    public decimal? ListPrice { get; set; }        // Precio de lista
    public decimal? DiscountPrice { get; set; }    // Precio con descuento
    public string Currency { get; set; } = "ARS";  // Moneda

    // Imágenes
    public string? CoverUrl { get; set; }          // URL de la carátula principal
    public List<string> GalleryUrls { get; set; }  // URLs de imágenes adicionales

    // Información editorial
    public string? Isbn { get; set; }              // ISBN
    public string? Isbn13 { get; set; }            // ISBN-13
    public List<string> Authors { get; set; }      // Autores
    public string Publisher { get; set; } = "Panini"; // Publisher
    public DateTime? PublicationDate { get; set; } // Fecha de publicación
    public int? PageCount { get; set; }            // Número de páginas
    public string? Format { get; set; }            // Formato
    public string? Dimensions { get; set; }        // Dimensiones

    // Contenido
    public string? Description { get; set; }       // Descripción
    public string? Synopsis { get; set; }          // Sinopsis
    public List<string> Categories { get; set; }   // Categorías
    public List<string> Tags { get; set; }         // Tags

    // Estado
    public bool IsAvailable { get; set; }          // Disponibilidad
    public bool IsOnSale { get; set; }             // En oferta
    public string? StockStatus { get; set; }       // Estado del stock
    public int? StockQuantity { get; set; }        // Cantidad disponible

    // Metadatos de scraping
    public DateTime ScrapedAt { get; set; }        // Fecha del scraping
    public string ScrapingSource { get; set; } = "Panini Argentina";
}
```

### **2. Información Específica de Manga/Cómic**
```csharp
public class PaniniComicSpecificData
{
    // Información de la serie
    public string? SeriesTitle { get; set; }       // Título de la serie
    public int? VolumeNumber { get; set; }         // Número de volumen
    public int? IssueNumber { get; set; }          // Número de issue (para cómics)
    public bool IsPartOfSeries { get; set; }       // Parte de serie

    // Información del original
    public string? OriginalPublisher { get; set; } // Editorial original
    public string? Imprint { get; set; }           // Sello editorial
    public List<string> Genres { get; set; }       // Géneros
    public string? TargetAudience { get; set; }    // Audiencia objetivo

    // Información de traducción
    public string? Translator { get; set; }        // Traductor
    public string? Letterer { get; set; }          // Letterer
    public string? Colorist { get; set; }          // Colorista
    public string? Language { get; set; } = "es";  // Idioma

    // Contenido adicional
    public bool HasVariantCover { get; set; }      // Cubierta variante
    public bool HasSpecialContent { get; set; }    // Contenido especial
    public string? SpecialContentType { get; set; } // Tipo de contenido especial
    public List<string> IncludedItems { get; set; } // Items incluidos
}
```

## 🔍 **Algoritmos de Extracción**

### **1. Extracción del Catálogo**
```csharp
public class PaniniCatalogExtractor
{
    public async Task<List<PaniniMangaData>> ExtractCatalogAsync(string catalogUrl)
    {
        var mangas = new List<PaniniMangaData>();
        var currentUrl = catalogUrl;

        while (currentUrl != null)
        {
            var document = await _htmlService.LoadPageAsync(currentUrl);
            var pageMangas = await ExtractMangasFromPageAsync(document);
            mangas.AddRange(pageMangas);

            currentUrl = ExtractNextPageUrl(document);

            // Rate limiting
            await Task.Delay(_settings.DelayBetweenRequests);
        }

        return mangas;
    }

    private async Task<List<PaniniMangaData>> ExtractMangasFromPageAsync(HtmlDocument document)
    {
        var productNodes = document.DocumentNode.SelectNodes(PaniniSelectors.ProductCard);
        var mangas = new List<PaniniMangaData>();

        foreach (var productNode in productNodes)
        {
            try
            {
                var manga = await ExtractBasicMangaDataAsync(productNode);
                if (manga != null && IsMangaProduct(manga))
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

    private bool IsMangaProduct(PaniniMangaData manga)
    {
        // Filtrar solo productos de manga
        return manga.Categories.Any(c =>
            c.Contains("manga", StringComparison.OrdinalIgnoreCase) ||
            c.Contains("manhwa", StringComparison.OrdinalIgnoreCase) ||
            c.Contains("manhua", StringComparison.OrdinalIgnoreCase));
    }
}
```

### **2. Extracción de Detalles Individuales**
```csharp
public class PaniniDetailExtractor
{
    public async Task<PaniniMangaData> ExtractDetailedMangaAsync(string productUrl)
    {
        var document = await _htmlService.LoadPageAsync(productUrl);

        var manga = new PaniniMangaData
        {
            Url = productUrl,
            ProductId = ExtractProductId(productUrl),
            ScrapedAt = DateTime.UtcNow
        };

        // Extraer información básica
        manga.Title = ExtractTitle(document);
        manga.Price = ExtractPrice(document);
        manga.CoverUrl = ExtractCoverUrl(document);
        manga.GalleryUrls = ExtractGalleryUrls(document);

        // Extraer información detallada
        manga.Description = ExtractDescription(document);
        manga.Isbn = ExtractIsbn(document);
        manga.Authors = ExtractAuthors(document);
        manga.PublicationDate = ExtractPublicationDate(document);
        manga.PageCount = ExtractPageCount(document);
        manga.Format = ExtractFormat(document);

        // Extraer información específica
        var comicData = ExtractComicSpecificData(document);
        MapComicDataToManga(manga, comicData);

        // Extraer categorías y tags
        manga.Categories = ExtractCategories(document);
        manga.Tags = ExtractTags(document);

        // Verificar disponibilidad
        manga.IsAvailable = CheckAvailability(document);
        manga.StockStatus = GetStockStatus(document);

        return manga;
    }

    private void MapComicDataToManga(PaniniMangaData manga, PaniniComicSpecificData comicData)
    {
        manga.SeriesTitle = comicData.SeriesTitle;
        manga.VolumeNumber = comicData.VolumeNumber;
        if (comicData.Genres != null)
        {
            manga.Tags.AddRange(comicData.Genres);
        }
    }
}
```

### **3. Extracción de Metadatos Especiales**
```csharp
public class PaniniMetadataExtractor
{
    public List<string> ExtractAuthors(HtmlDocument document)
    {
        var authors = new List<string>();

        // Buscar en campos específicos
        var authorNodes = document.DocumentNode.SelectNodes(PaniniSelectors.AuthorSelector);
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

        // Buscar en descripción
        var description = document.DocumentNode.SelectSingleNode(PaniniSelectors.SingleProductDescription);
        if (description != null)
        {
            authors.AddRange(ExtractAuthorsFromText(description.InnerText));
        }

        return authors.Distinct().ToList();
    }

    public DateTime? ExtractPublicationDate(HtmlDocument document)
    {
        // Buscar en metadatos
        var dateNode = document.DocumentNode.SelectSingleNode(PaniniSelectors.PublicationDateSelector);
        if (dateNode != null)
        {
            return ParseDate(dateNode.InnerText);
        }

        // Buscar en JSON-LD
        var jsonLdDate = ExtractFromJsonLd(document, "datePublished");
        if (jsonLdDate != null)
        {
            return ParseDate(jsonLdDate);
        }

        // Buscar en texto de la página
        var content = document.DocumentNode.InnerText;
        return ExtractDateFromText(content);
    }

    public PaniniComicSpecificData ExtractComicSpecificData(HtmlDocument document)
    {
        var data = new PaniniComicSpecificData();

        // Extraer información de serie
        data.SeriesTitle = ExtractSeriesTitle(document);
        data.VolumeNumber = ExtractVolumeNumber(document);
        data.IssueNumber = ExtractIssueNumber(document);

        // Extraer géneros
        data.Genres = ExtractGenres(document);

        // Extraer información de producción
        data.Translator = ExtractTranslator(document);
        data.Letterer = ExtractLetterer(document);
        data.Colorist = ExtractColorist(document);

        return data;
    }
}
```

## 🔄 **Manejo de Paginación**

### **1. Sistema de Paginación de Panini**
```csharp
public class PaniniPaginationHandler
{
    public string? ExtractNextPageUrl(HtmlDocument document)
    {
        var nextLink = document.DocumentNode.SelectSingleNode(PaniniSelectors.NextPage);
        if (nextLink != null)
        {
            var href = nextLink.GetAttributeValue("href", "");
            return string.IsNullOrEmpty(href) ? null : href;
        }

        return null;
    }

    public List<string> ExtractAllPageUrls(string baseUrl, HtmlDocument document)
    {
        var pageUrls = new List<string> { baseUrl };

        var pageLinks = document.DocumentNode.SelectNodes(PaniniSelectors.PageNumbers);
        if (pageLinks != null)
        {
            foreach (var link in pageLinks)
            {
                var href = link.GetAttributeValue("href", "");
                if (!string.IsNullOrEmpty(href) && href != baseUrl)
                {
                    pageUrls.Add(href);
                }
            }
        }

        return pageUrls.Distinct().ToList();
    }

    public int GetTotalPages(HtmlDocument document)
    {
        var lastPageLink = document.DocumentNode.SelectNodes(PaniniSelectors.PageNumbers)?.LastOrDefault();
        if (lastPageLink != null)
        {
            var href = lastPageLink.GetAttributeValue("href", "");
            var match = Regex.Match(href, @"page=(\d+)");
            if (match.Success)
            {
                return int.Parse(match.Groups[1].Value);
            }
        }

        return 1;
    }
}
```

## 🖼️ **Manejo de Imágenes**

### **1. Extracción de Carátulas**
```csharp
public class PaniniImageExtractor
{
    public string? ExtractCoverUrl(HtmlDocument document)
    {
        // Buscar imagen principal
        var mainImage = document.DocumentNode.SelectSingleNode(PaniniSelectors.SingleProductImage);
        if (mainImage != null)
        {
            var src = mainImage.GetAttributeValue("src", "");
            if (!string.IsNullOrEmpty(src))
            {
                return ConvertToHighResUrl(src);
            }
        }

        // Buscar en JSON-LD
        var jsonLdImage = ExtractFromJsonLd(document, "image");
        if (jsonLdImage != null)
        {
            return jsonLdImage;
        }

        return null;
    }

    public List<string> ExtractGalleryUrls(HtmlDocument document)
    {
        var galleryUrls = new List<string>();

        var galleryImages = document.DocumentNode.SelectNodes(PaniniSelectors.SingleProductGallery);
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
        // Panini usa diferentes tamaños de imagen
        // Convertir thumbnails a full resolution
        return imageUrl.Replace("_thumb", "").Replace("_small", "").Replace("_medium", "");
    }
}
```

## 📊 **Patrones de Contenido**

### **1. Patrones de Título**
```csharp
public class PaniniTitlePatterns
{
    private static readonly Regex VolumePattern = new(@"(.+?)\s+(?:Vol\.?|Volume|Tom\.?|Tomo|#)\s*(\d+)", RegexOptions.IgnoreCase);
    private static readonly Regex IssuePattern = new(@"(.+?)\s+(?:#\s*(\d+))", RegexOptions.IgnoreCase);
    private static readonly Regex AnnualPattern = new(@"(.+?)\s+(?:Annual|Anual)\s*(\d+)", RegexOptions.IgnoreCase);

    public static (string title, int? volume, int? issue) ParseTitle(string fullTitle)
    {
        // Intentar patrón de volumen
        var volumeMatch = VolumePattern.Match(fullTitle);
        if (volumeMatch.Success)
        {
            var title = volumeMatch.Groups[1].Value.Trim();
            var volume = int.Parse(volumeMatch.Groups[2].Value);
            return (title, volume, null);
        }

        // Intentar patrón de issue
        var issueMatch = IssuePattern.Match(fullTitle);
        if (issueMatch.Success)
        {
            var title = issueMatch.Groups[1].Value.Trim();
            var issue = int.Parse(issueMatch.Groups[2].Value);
            return (title, null, issue);
        }

        return (fullTitle, null, null);
    }
}
```

### **2. Patrones de Descripción**
```csharp
public class PaniniDescriptionPatterns
{
    public static string? ExtractIsbnFromDescription(string description)
    {
        var isbnPatterns = new[]
        {
            @"ISBN\s*:?\s*([0-9\-]{10,17})",
            @"ISBN-13\s*:?\s*([0-9\-]{13,17})",
            @"ISBN-10\s*:?\s*([0-9\-]{10,13})"
        };

        foreach (var pattern in isbnPatterns)
        {
            var match = Regex.Match(description, pattern, RegexOptions.IgnoreCase);
            if (match.Success)
            {
                return match.Groups[1].Value;
            }
        }

        return null;
    }

    public static List<string> ExtractAuthorsFromDescription(string description)
    {
        var authorPatterns = new[]
        {
            @"(?:Autor|Escritor|Guionista|Story)\s*:?\s*([^;\n]+)",
            @"(?:Dibujante|Artist|Penciller)\s*:?\s*([^;\n]+)",
            @"(?:Entintador|Inker)\s*:?\s*([^;\n]+)",
            @"(?:Colorista|Colorist)\s*:?\s*([^;\n]+)"
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
        // Manejar separadores comunes
        return authorText.Split(new[] { ",", " y ", " & ", " with " }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(a => a.Trim());
    }
}
```

## 🚨 **Manejo de Errores y Edge Cases**

### **1. Productos No Disponibles**
```csharp
public class PaniniErrorHandler
{
    public bool IsProductAvailable(HtmlDocument document)
    {
        // Buscar indicadores de no disponibilidad
        var outOfStock = document.DocumentNode.SelectSingleNode(".out-of-stock, .agotado");
        if (outOfStock != null) return false;

        // Buscar texto de agotado
        var content = document.DocumentNode.InnerText;
        if (content.Contains("agotado", StringComparison.OrdinalIgnoreCase)) return false;
        if (content.Contains("no disponible", StringComparison.OrdinalIgnoreCase)) return false;

        // Verificar si hay precio y botón de compra
        var price = document.DocumentNode.SelectSingleNode(PaniniSelectors.SingleProductPrice);
        var buyButton = document.DocumentNode.SelectSingleNode(".buy-button, .add-to-cart");

        return price != null && buyButton != null;
    }

    public string? GetStockStatus(HtmlDocument document)
    {
        var stockNode = document.DocumentNode.SelectSingleNode(".stock-status, .availability");
        if (stockNode != null)
        {
            return stockNode.InnerText.Trim();
        }

        return IsProductAvailable(document) ? "Disponible" : "Agotado";
    }
}
```

### **2. Contenido Dinámico y JavaScript**
```csharp
public class PaniniDynamicContentHandler
{
    public async Task<HtmlDocument> LoadDynamicContentAsync(string url)
    {
        // Verificar si la página usa JavaScript para cargar contenido
        var initialDocument = await _htmlService.LoadPageAsync(url);

        // Buscar indicadores de contenido dinámico
        var hasDynamicContent = HasDynamicContentIndicators(initialDocument);

        if (hasDynamicContent)
        {
            // Usar browser automation para cargar contenido completo
            return await _browserService.LoadPageAsync(url);
        }

        return initialDocument;
    }

    private bool HasDynamicContentIndicators(HtmlDocument document)
    {
        // Buscar scripts que indiquen carga dinámica
        var scripts = document.DocumentNode.SelectNodes("//script[contains(text(), 'fetch') or contains(text(), 'axios') or contains(text(), 'loadMore')]");
        if (scripts != null && scripts.Any()) return true;

        // Buscar elementos con data attributes que indiquen carga lazy
        var lazyElements = document.DocumentNode.SelectNodes("[data-lazy], [data-load]");
        if (lazyElements != null && lazyElements.Any()) return true;

        return false;
    }
}
```

## 📈 **Métricas de Calidad**

### **1. Métricas de Extracción**
```csharp
public class PaniniExtractionMetrics
{
    public int TotalProducts { get; set; }
    public int SuccessfullyExtracted { get; set; }
    public int FailedExtractions { get; set; }
    public double SuccessRate => TotalProducts > 0 ? (double)SuccessfullyExtracted / TotalProducts : 0;

    public Dictionary<string, int> FailureReasons { get; set; } = new();
    public TimeSpan AverageExtractionTime { get; set; }
    public Dictionary<string, int> DataCompleteness { get; set; } = new();

    // Métricas específicas de Panini
    public int MangaProducts { get; set; }
    public int ComicProducts { get; set; }
    public int GraphicNovelProducts { get; set; }
}
```

### **2. Validación de Datos**
```csharp
public class PaniniDataValidator
{
    public List<string> ValidateMangaData(PaniniMangaData manga)
    {
        var errors = new List<string>();

        if (string.IsNullOrEmpty(manga.Title))
            errors.Add("Título faltante");

        if (string.IsNullOrEmpty(manga.ProductId))
            errors.Add("ID de producto faltante");

        if (string.IsNullOrEmpty(manga.Url))
            errors.Add("URL faltante");

        if (manga.PublicationDate > DateTime.Now.AddMonths(6))
            errors.Add("Fecha de publicación demasiado futura");

        if (manga.PageCount < 0 || manga.PageCount > 1000)
            errors.Add("Número de páginas inválido");

        if (!string.IsNullOrEmpty(manga.Isbn) && !IsValidIsbn(manga.Isbn))
            errors.Add("ISBN inválido");

        return errors;
    }

    private bool IsValidIsbn(string isbn)
    {
        // Implementar validación de ISBN
        return true; // Placeholder
    }
}
```

## 🔄 **Estrategia de Sincronización**

### **1. Detección de Cambios**
```csharp
public class PaniniChangeDetector
{
    public async Task<List<string>> DetectNewOrUpdatedProductsAsync()
    {
        // Panini no tiene RSS feed público, usar otras estrategias

        // 1. Verificar página de novedades
        var newProducts = await DetectNewProductsFromNoveltiesPageAsync();

        // 2. Verificar productos modificados por fecha
        var updatedProducts = await DetectUpdatedProductsAsync();

        return newProducts.Concat(updatedProducts).Distinct().ToList();
    }

    private async Task<List<string>> DetectNewProductsFromNoveltiesPageAsync()
    {
        var noveltiesUrl = "https://www.panini.com.ar/novedades";
        var document = await _htmlService.LoadPageAsync(noveltiesUrl);

        var productLinks = document.DocumentNode.SelectNodes(".product-link");
        return productLinks?.Select(link => link.GetAttributeValue("href", ""))
                          .Where(href => !string.IsNullOrEmpty(href))
                          .ToList() ?? new List<string>();
    }

    private async Task<List<string>> DetectUpdatedProductsAsync()
    {
        // Estrategia: comparar checksums de páginas conocidas
        var knownProducts = await GetKnownProductsAsync();
        var updatedProducts = new List<string>();

        foreach (var product in knownProducts)
        {
            if (await HasProductChangedAsync(product.Url, product.LastChecksum))
            {
                updatedProducts.Add(product.Url);
            }
        }

        return updatedProducts;
    }
}
```

### **2. Sync Incremental**
```csharp
public class PaniniIncrementalSync
{
    public async Task SyncAsync()
    {
        // 1. Obtener productos nuevos o modificados
        var changedUrls = await _changeDetector.DetectNewOrUpdatedProductsAsync();

        // 2. Procesar productos en lotes para no sobrecargar
        var batches = changedUrls.Chunk(10);

        foreach (var batch in batches)
        {
            var tasks = batch.Select(url => ProcessProductAsync(url));
            await Task.WhenAll(tasks);

            // Pequeño delay entre lotes
            await Task.Delay(1000);
        }

        // 3. Limpiar productos obsoletos
        await CleanupObsoleteProductsAsync();

        // 4. Actualizar métricas
        await UpdateSyncMetricsAsync();
    }

    private async Task ProcessProductAsync(string url)
    {
        try
        {
            var manga = await _detailExtractor.ExtractDetailedMangaAsync(url);
            await SaveOrUpdateMangaAsync(manga);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing product {Url}", url);
            await MarkProductAsFailedAsync(url, ex.Message);
        }
    }
}
```

## 🎯 **Checklist Específico de Panini**

### **Fase 1: Análisis del Sitio** ✅
- [x] Mapear estructura del sitio
- [x] Identificar selectores CSS principales
- [x] Documentar patrones de URL
- [x] Analizar tipos de contenido

### **Fase 2: Extracción Básica** 🔄
- [ ] Implementar extracción del catálogo
- [ ] Extraer información básica de productos
- [ ] Manejar paginación
- [ ] Implementar rate limiting

### **Fase 3: Extracción Avanzada** ⏳
- [ ] Extraer detalles individuales
- [ ] Manejar contenido dinámico
- [ ] Implementar validación de datos
- [ ] Extraer metadatos específicos

### **Fase 4: Optimización** 📅
- [ ] Implementar cache inteligente
- [ ] Sync incremental
- [ ] Monitoreo de cambios
- [ ] Error recovery automático

### **Fase 5: Producción** 🔄
- [ ] Testing exhaustivo
- [ ] Monitoreo de performance
- [ ] Alertas de calidad de datos
- [ ] Documentación de mantenimiento</content>
<parameter name="filePath">c:\repos\MangaCount\PANINI_PUBLISHER_BIBLE.md
