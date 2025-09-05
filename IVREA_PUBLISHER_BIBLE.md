# 📖 Biblia de Publisher: Ivrea Argentina

## 🎯 **Visión General**

Ivrea es el publisher más importante de manga en Argentina. Publica tanto manga japonés como manhwa coreano, con un catálogo extenso y actualizado regularmente.

## 🌐 **Análisis del Sitio Web**

### **1. URL Base**
- **Sitio Principal**: `https://www.ivrea.com.ar`
- **Catálogo Manga**: `https://www.ivrea.com.ar/catalogo`
- **Categorías**: `https://www.ivrea.com.ar/categoria/manga`

### **2. Estructura del Sitio**
```
ivrea.com.ar/
├── catalogo/                    # Catálogo completo
│   ├── manga/                   # Manga japonés
│   ├── manhwa/                  # Manhwa coreano
│   └── novedades/               # Novedades recientes
├── producto/[slug]/             # Página individual de producto
└── categoria/[categoria]/       # Categorías específicas
```

### **3. Tecnologías Detectadas**
- **CMS**: WordPress con WooCommerce
- **Tema**: Tema personalizado para e-commerce
- **JavaScript**: jQuery para interactividad
- **Imágenes**: Sistema de carátulas optimizado
- **SEO**: Schema.org markup para productos

## 🔍 **Estrategia de Scraping**

### **1. Patrón de URLs**
```csharp
public class IvreaUrlPatterns
{
    public const string BaseUrl = "https://www.ivrea.com.ar";
    public const string CatalogUrl = "https://www.ivrea.com.ar/catalogo";
    public const string MangaCategoryUrl = "https://www.ivrea.com.ar/categoria/manga";
    public const string ManhwaCategoryUrl = "https://www.ivrea.com.ar/categoria/manhwa";

    public static string GetProductUrl(string slug)
        => $"{BaseUrl}/producto/{slug}";

    public static bool IsProductUrl(string url)
        => url.Contains("/producto/");

    public static bool IsCatalogUrl(string url)
        => url.Contains("/catalogo") || url.Contains("/categoria/manga");
}
```

### **2. Selectores CSS Principales**
```csharp
public class IvreaSelectors
{
    // Catálogo - Lista de productos
    public const string ProductList = ".products .product";
    public const string ProductLink = ".product a.woocommerce-LoopProduct-link";
    public const string ProductTitle = ".product-title, .woocommerce-loop-product__title";
    public const string ProductPrice = ".price .woocommerce-Price-amount";
    public const string ProductImage = ".product-image img, .woocommerce-product-gallery__image img";

    // Paginación
    public const string Pagination = ".woocommerce-pagination";
    public const string NextPage = ".next.page-numbers";
    public const string PageNumbers = ".page-numbers";

    // Página de producto individual
    public const string SingleProductTitle = ".product_title";
    public const string SingleProductPrice = ".price .woocommerce-Price-amount";
    public const string SingleProductDescription = ".woocommerce-product-details__short-description";
    public const string SingleProductFullDescription = ".woocommerce-product-details__full-description";
    public const string SingleProductImage = ".woocommerce-product-gallery__image img";
    public const string SingleProductMeta = ".product_meta";
    public const string SingleProductCategories = ".product_meta .posted_in a";
    public const string SingleProductTags = ".product_meta .tagged_as a";

    // Información adicional
    public const string IsbnSelector = "[data-isbn], .isbn";
    public const string AuthorSelector = ".author, [data-author]";
    public const string PublisherSelector = ".publisher, [data-publisher]";
    public const string PublicationDateSelector = ".publication-date, [data-publication-date]";
    public const string PageCountSelector = ".page-count, [data-page-count]";
    public const string DimensionsSelector = ".dimensions, [data-dimensions]";
}
```

## 📋 **Campos de Datos Disponibles**

### **1. Información Básica**
```csharp
public class IvreaMangaData
{
    // Información del producto
    public string Title { get; set; }              // Título del manga
    public string? OriginalTitle { get; set; }     // Título original (kanji/kana)
    public string Slug { get; set; }               // Slug de WordPress
    public string Url { get; set; }                // URL completa del producto

    // Precios
    public decimal? Price { get; set; }            // Precio actual
    public decimal? RegularPrice { get; set; }     // Precio regular
    public decimal? SalePrice { get; set; }        // Precio de oferta
    public string Currency { get; set; } = "ARS";  // Moneda (siempre ARS)

    // Imágenes
    public string? CoverUrl { get; set; }          // URL de la carátula principal
    public List<string> GalleryUrls { get; set; }  // URLs de imágenes adicionales

    // Información editorial
    public string? Isbn { get; set; }              // ISBN del volumen
    public string? Isbn13 { get; set; }            // ISBN-13
    public List<string> Authors { get; set; }      // Autores (mangaka)
    public string Publisher { get; set; } = "Ivrea"; // Publisher (siempre Ivrea)
    public DateTime? PublicationDate { get; set; } // Fecha de publicación
    public int? PageCount { get; set; }            // Número de páginas
    public string? Format { get; set; }            // Formato (tapa blanda, etc.)
    public string? Dimensions { get; set; }        // Dimensiones físicas

    // Contenido
    public string? ShortDescription { get; set; }  // Descripción corta
    public string? FullDescription { get; set; }   // Descripción completa
    public List<string> Categories { get; set; }   // Categorías de WordPress
    public List<string> Tags { get; set; }         // Tags del producto

    // Estado
    public bool IsAvailable { get; set; }          // Si está disponible
    public bool IsOnSale { get; set; }             // Si está en oferta
    public string? StockStatus { get; set; }       // Estado del stock
    public int? StockQuantity { get; set; }        // Cantidad en stock

    // Metadatos de scraping
    public DateTime ScrapedAt { get; set; }        // Fecha y hora del scraping
    public string ScrapingSource { get; set; } = "Ivrea Argentina";
}
```

### **2. Información Específica de Manga**
```csharp
public class IvreaMangaSpecificData
{
    // Información de la serie
    public string? SeriesTitle { get; set; }       // Título de la serie completa
    public int? VolumeNumber { get; set; }         // Número de volumen
    public bool IsPartOfSeries { get; set; }       // Si pertenece a una serie

    // Información del original
    public string? OriginalPublisher { get; set; } // Editorial original (Shueisha, etc.)
    public string? Demographic { get; set; }       // Demografía (shonen, seinen, etc.)
    public List<string> Genres { get; set; }       // Géneros del manga
    public string? TargetAudience { get; set; }    // Audiencia objetivo

    // Información de traducción
    public string? Translator { get; set; }        // Traductor
    public string? Letterer { get; set; }          // Letterer
    public string? Proofreader { get; set; }       // Corrector
    public string? Language { get; set; } = "es";  // Idioma de la edición

    // Contenido adicional
    public bool HasColorPages { get; set; }        // Si tiene páginas a color
    public bool HasSpecialContent { get; set; }    // Si tiene contenido especial
    public string? SpecialContentType { get; set; } // Tipo de contenido especial
}
```

## 🔍 **Algoritmos de Extracción**

### **1. Extracción del Catálogo**
```csharp
public class IvreaCatalogExtractor
{
    public async Task<List<IvreaMangaData>> ExtractCatalogAsync(string catalogUrl)
    {
        var mangas = new List<IvreaMangaData>();
        var currentUrl = catalogUrl;

        while (currentUrl != null)
        {
            var document = await _htmlService.LoadPageAsync(currentUrl);
            var pageMangas = await ExtractMangasFromPageAsync(document);
            mangas.AddRange(pageMangas);

            currentUrl = ExtractNextPageUrl(document);
        }

        return mangas;
    }

    private async Task<List<IvreaMangaData>> ExtractMangasFromPageAsync(HtmlDocument document)
    {
        var productNodes = document.DocumentNode.SelectNodes(IvreaSelectors.ProductList);
        var mangas = new List<IvreaMangaData>();

        foreach (var productNode in productNodes)
        {
            try
            {
                var manga = await ExtractBasicMangaDataAsync(productNode);
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
}
```

### **2. Extracción de Detalles Individuales**
```csharp
public class IvreaDetailExtractor
{
    public async Task<IvreaMangaData> ExtractDetailedMangaAsync(string productUrl)
    {
        var document = await _htmlService.LoadPageAsync(productUrl);

        var manga = new IvreaMangaData
        {
            Url = productUrl,
            ScrapedAt = DateTime.UtcNow
        };

        // Extraer información básica
        manga.Title = ExtractTitle(document);
        manga.Slug = ExtractSlug(productUrl);
        manga.Price = ExtractPrice(document);
        manga.CoverUrl = ExtractCoverUrl(document);

        // Extraer información detallada
        manga.ShortDescription = ExtractShortDescription(document);
        manga.FullDescription = ExtractFullDescription(document);
        manga.Isbn = ExtractIsbn(document);
        manga.Authors = ExtractAuthors(document);
        manga.PublicationDate = ExtractPublicationDate(document);
        manga.PageCount = ExtractPageCount(document);

        // Extraer categorías y tags
        manga.Categories = ExtractCategories(document);
        manga.Tags = ExtractTags(document);

        // Extraer información específica de manga
        var mangaSpecificData = ExtractMangaSpecificData(document);
        // Mapear datos específicos al modelo principal

        return manga;
    }
}
```

### **3. Extracción de Metadatos Especiales**
```csharp
public class IvreaMetadataExtractor
{
    public List<string> ExtractAuthors(HtmlDocument document)
    {
        var authors = new List<string>();

        // Buscar en schema.org markup
        var schemaAuthors = document.DocumentNode.SelectNodes("//script[@type='application/ld+json']");
        if (schemaAuthors != null)
        {
            foreach (var script in schemaAuthors)
            {
                // Parsear JSON-LD y extraer autores
            }
        }

        // Buscar en campos personalizados
        var authorNodes = document.DocumentNode.SelectNodes(IvreaSelectors.AuthorSelector);
        if (authorNodes != null)
        {
            authors.AddRange(authorNodes.Select(n => n.InnerText.Trim()));
        }

        // Buscar en descripción
        var description = document.DocumentNode.SelectSingleNode(IvreaSelectors.SingleProductDescription);
        if (description != null)
        {
            authors.AddRange(ExtractAuthorsFromText(description.InnerText));
        }

        return authors.Distinct().ToList();
    }

    public DateTime? ExtractPublicationDate(HtmlDocument document)
    {
        // Buscar en schema.org
        var schemaDate = ExtractFromSchemaOrg(document, "datePublished");
        if (schemaDate != null) return ParseDate(schemaDate);

        // Buscar en metadatos personalizados
        var dateNode = document.DocumentNode.SelectSingleNode(IvreaSelectors.PublicationDateSelector);
        if (dateNode != null) return ParseDate(dateNode.InnerText);

        // Buscar en descripción
        var description = document.DocumentNode.SelectSingleNode(IvreaSelectors.SingleProductDescription);
        if (description != null)
        {
            return ExtractDateFromText(description.InnerText);
        }

        return null;
    }
}
```

## 🔄 **Manejo de Paginación**

### **1. Sistema de Paginación de WooCommerce**
```csharp
public class IvreaPaginationHandler
{
    public string? ExtractNextPageUrl(HtmlDocument document)
    {
        // WooCommerce pagination structure
        var nextLink = document.DocumentNode.SelectSingleNode(IvreaSelectors.NextPage);
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

        var pageLinks = document.DocumentNode.SelectNodes(IvreaSelectors.PageNumbers);
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
}
```

## 🖼️ **Manejo de Imágenes**

### **1. Extracción de Carátulas**
```csharp
public class IvreaImageExtractor
{
    public string? ExtractCoverUrl(HtmlDocument document)
    {
        // Buscar en WooCommerce product gallery
        var galleryImage = document.DocumentNode.SelectSingleNode(IvreaSelectors.SingleProductImage);
        if (galleryImage != null)
        {
            var src = galleryImage.GetAttributeValue("src", "");
            if (!string.IsNullOrEmpty(src))
            {
                return ConvertToFullSizeUrl(src);
            }
        }

        // Buscar en schema.org
        var schemaImage = ExtractFromSchemaOrg(document, "image");
        if (schemaImage != null)
        {
            return schemaImage;
        }

        return null;
    }

    public List<string> ExtractGalleryUrls(HtmlDocument document)
    {
        var galleryUrls = new List<string>();

        var galleryImages = document.DocumentNode.SelectNodes(".woocommerce-product-gallery__image img");
        if (galleryImages != null)
        {
            foreach (var img in galleryImages)
            {
                var src = img.GetAttributeValue("src", "");
                if (!string.IsNullOrEmpty(src))
                {
                    galleryUrls.Add(ConvertToFullSizeUrl(src));
                }
            }
        }

        return galleryUrls;
    }

    private string ConvertToFullSizeUrl(string thumbnailUrl)
    {
        // Convertir URLs de thumbnail a full size
        // WooCommerce usa diferentes tamaños: -100x100.jpg, -300x300.jpg, etc.
        return thumbnailUrl.Replace("-100x100", "").Replace("-300x300", "");
    }
}
```

## 📊 **Patrones de Contenido**

### **1. Patrones de Título**
```csharp
public class IvreaTitlePatterns
{
    private static readonly Regex VolumePattern = new(@"(.+?)\s+(?:Vol\.?|Volume|Tom\.?|Tomo)\s*(\d+)", RegexOptions.IgnoreCase);
    private static readonly Regex ChapterPattern = new(@"(.+?)\s+(?:Cap\.?|Capítulo)\s*(\d+)", RegexOptions.IgnoreCase);

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
public class IvreaDescriptionPatterns
{
    public static string? ExtractIsbnFromDescription(string description)
    {
        var isbnPattern = new Regex(@"ISBN\s*:?\s*([0-9\-]+)", RegexOptions.IgnoreCase);
        var match = isbnPattern.Match(description);
        return match.Success ? match.Groups[1].Value : null;
    }

    public static List<string> ExtractAuthorsFromDescription(string description)
    {
        var authorPatterns = new[]
        {
            @"Autor(?:es)?\s*:?\s*([^;\n]+)",
            @"Mangaka\s*:?\s*([^;\n]+)",
            @"Guionista\s*:?\s*([^;\n]+)",
            @"de\s+([^;\n]+)(?:\s*\(mangaka\)|\s*\(autor\))"
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
        // Manejar casos como "Autor1, Autor2 y Autor3"
        return authorText.Split(new[] { ",", " y ", " & " }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(a => a.Trim());
    }
}
```

## 🚨 **Manejo de Errores y Edge Cases**

### **1. Productos No Disponibles**
```csharp
public class IvreaErrorHandler
{
    public bool IsProductAvailable(HtmlDocument document)
    {
        // Buscar clase "out-of-stock"
        var outOfStock = document.DocumentNode.SelectSingleNode(".out-of-stock");
        if (outOfStock != null) return false;

        // Buscar texto "Agotado"
        var content = document.DocumentNode.InnerText;
        if (content.Contains("Agotado", StringComparison.OrdinalIgnoreCase)) return false;

        // Buscar botón de "Añadir al carrito"
        var addToCart = document.DocumentNode.SelectSingleNode(".single_add_to_cart_button");
        if (addToCart == null) return false;

        return true;
    }

    public string? GetAvailabilityStatus(HtmlDocument document)
    {
        if (!IsProductAvailable(document))
        {
            return "Agotado";
        }

        var stockStatus = document.DocumentNode.SelectSingleNode(".stock");
        return stockStatus?.InnerText?.Trim() ?? "Disponible";
    }
}
```

### **2. Contenido Dinámico**
```csharp
public class IvreaDynamicContentHandler
{
    public async Task<HtmlDocument> LoadDynamicContentAsync(string url)
    {
        // Algunos productos pueden cargar contenido vía AJAX
        var document = await _htmlService.LoadPageAsync(url);

        // Verificar si hay contenido dinámico
        var hasDynamicContent = document.DocumentNode.SelectSingleNode("[data-dynamic]");
        if (hasDynamicContent != null)
        {
            // Usar Puppeteer para cargar contenido dinámico
            return await _browserService.LoadPageAsync(url);
        }

        return document;
    }
}
```

## 📈 **Métricas de Calidad**

### **1. Métricas de Extracción**
```csharp
public class IvreaExtractionMetrics
{
    public int TotalProducts { get; set; }
    public int SuccessfullyExtracted { get; set; }
    public int FailedExtractions { get; set; }
    public double SuccessRate => TotalProducts > 0 ? (double)SuccessfullyExtracted / TotalProducts : 0;

    public Dictionary<string, int> FailureReasons { get; set; } = new();
    public TimeSpan AverageExtractionTime { get; set; }
    public Dictionary<string, int> DataCompleteness { get; set; } = new();
}
```

### **2. Validación de Datos**
```csharp
public class IvreaDataValidator
{
    public List<string> ValidateMangaData(IvreaMangaData manga)
    {
        var errors = new List<string>();

        if (string.IsNullOrEmpty(manga.Title))
            errors.Add("Título faltante");

        if (string.IsNullOrEmpty(manga.Url))
            errors.Add("URL faltante");

        if (manga.PublicationDate > DateTime.Now)
            errors.Add("Fecha de publicación futura");

        if (manga.PageCount < 0)
            errors.Add("Número de páginas negativo");

        if (!string.IsNullOrEmpty(manga.Isbn) && !IsValidIsbn(manga.Isbn))
            errors.Add("ISBN inválido");

        return errors;
    }

    private bool IsValidIsbn(string isbn)
    {
        // Implementar validación de ISBN-10 e ISBN-13
        return true; // Placeholder
    }
}
```

## 🔄 **Estrategia de Sincronización**

### **1. Detección de Cambios**
```csharp
public class IvreaChangeDetector
{
    public async Task<List<string>> DetectNewOrUpdatedProductsAsync()
    {
        var lastSync = await GetLastSyncTimestampAsync();
        var rssFeed = await LoadRssFeedAsync();

        var changedProducts = new List<string>();

        foreach (var item in rssFeed.Items)
        {
            if (item.PublishDate > lastSync)
            {
                changedProducts.Add(item.Link);
            }
        }

        return changedProducts;
    }

    private async Task<SyndicationFeed> LoadRssFeedAsync()
    {
        var rssUrl = "https://www.ivrea.com.ar/feed/?post_type=product";
        var xml = await _httpClient.GetStringAsync(rssUrl);

        using var reader = XmlReader.Create(new StringReader(xml));
        return SyndicationFeed.Load(reader);
    }
}
```

### **2. Sync Incremental**
```csharp
public class IvreaIncrementalSync
{
    public async Task SyncAsync()
    {
        // 1. Obtener productos modificados desde última sync
        var changedUrls = await _changeDetector.DetectNewOrUpdatedProductsAsync();

        // 2. Procesar solo productos cambiados
        foreach (var url in changedUrls)
        {
            try
            {
                var manga = await _detailExtractor.ExtractDetailedMangaAsync(url);
                await SaveOrUpdateMangaAsync(manga);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing product {Url}", url);
            }
        }

        // 3. Actualizar timestamp de última sync
        await UpdateLastSyncTimestampAsync();
    }
}
```

## 🎯 **Checklist Específico de Ivrea**

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
- [ ] Extraer metadatos especiales

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
<parameter name="filePath">c:\repos\MangaCount\IVREA_PUBLISHER_BIBLE.md
