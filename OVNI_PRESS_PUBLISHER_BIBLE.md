# 📖 Biblia de Publisher: Ovni Press

## 🎯 **Visión General**

Ovni Press es un publisher argentino especializado en manga y cultura pop japonesa. Publica tanto manga japonés como manhwa coreano, con un enfoque en series de calidad y ediciones especiales.

## 🌐 **Análisis del Sitio Web**

### **1. URL Base**
- **Sitio Principal**: `https://www.ovnipress.net`
- **Catálogo Manga**: `https://www.ovnipress.net/catalogo`
- **Novedades**: `https://www.ovnipress.net/novedades`

### **2. Estructura del Sitio**
```
ovnipress.net/
├── catalogo/                   # Catálogo completo
│   ├── manga/                  # Manga japonés
│   ├── manhwa/                 # Manhwa coreano
│   └── ediciones-especiales/    # Ediciones especiales
├── producto/[slug]/            # Página individual de producto
├── series/[slug]/              # Páginas de series completas
└── busqueda/                   # Sistema de búsqueda
```

### **3. Tecnologías Detectadas**
- **CMS**: WordPress con tema personalizado
- **E-commerce**: WooCommerce
- **JavaScript**: jQuery y scripts personalizados
- **Imágenes**: Sistema de carátulas optimizado
- **SEO**: Schema.org markup básico

## 🔍 **Estrategia de Scraping**

### **1. Patrón de URLs**
```csharp
public class OvniPressUrlPatterns
{
    public const string BaseUrl = "https://www.ovnipress.net";
    public const string CatalogUrl = "https://www.ovnipress.net/catalogo";
    public const string MangaCatalogUrl = "https://www.ovnipress.net/catalogo/manga";
    public const string ManhwaCatalogUrl = "https://www.ovnipress.net/catalogo/manhwa";
    public const string SpecialEditionsUrl = "https://www.ovnipress.net/catalogo/ediciones-especiales";

    public static string GetProductUrl(string slug)
        => $"{BaseUrl}/producto/{slug}";

    public static string GetSeriesUrl(string slug)
        => $"{BaseUrl}/series/{slug}";

    public static bool IsProductUrl(string url)
        => url.Contains("/producto/");

    public static bool IsSeriesUrl(string url)
        => url.Contains("/series/");

    public static bool IsCatalogUrl(string url)
        => url.Contains("/catalogo");
}
```

### **2. Selectores CSS Principales**
```csharp
public class OvniPressSelectors
{
    // Catálogo - Lista de productos
    public const string ProductList = ".products .product";
    public const string ProductItem = ".product-item, .product-card";
    public const string ProductLink = ".product-link, .woocommerce-LoopProduct-link";
    public const string ProductTitle = ".product-title, .woocommerce-loop-product__title";
    public const string ProductPrice = ".product-price, .price";
    public const string ProductImage = ".product-image img, .attachment-woocommerce_thumbnail";

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
    public const string SingleProductGallery = ".woocommerce-product-gallery img";

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
    public const string DemographicSelector = ".demographic, [data-demographic]";
}
```

## 📋 **Campos de Datos Disponibles**

### **1. Información Básica**
```csharp
public class OvniPressMangaData
{
    // Información del producto
    public string Title { get; set; }              // Título del manga
    public string? OriginalTitle { get; set; }     // Título original
    public string Slug { get; set; }               // Slug de WordPress
    public string Url { get; set; }                // URL completa del producto

    // Precios
    public decimal? Price { get; set; }            // Precio actual
    public decimal? RegularPrice { get; set; }     // Precio regular
    public decimal? SalePrice { get; set; }        // Precio de oferta
    public string Currency { get; set; } = "ARS";  // Moneda

    // Imágenes
    public string? CoverUrl { get; set; }          // URL de la carátula principal
    public List<string> GalleryUrls { get; set; }  // URLs de imágenes adicionales

    // Información editorial
    public string? Isbn { get; set; }              // ISBN
    public string? Isbn13 { get; set; }            // ISBN-13
    public List<string> Authors { get; set; }      // Autores (mangaka)
    public string Publisher { get; set; } = "Ovni Press"; // Publisher
    public DateTime? PublicationDate { get; set; } // Fecha de publicación
    public int? PageCount { get; set; }            // Número de páginas
    public string? Format { get; set; }            // Formato
    public string? Dimensions { get; set; }        // Dimensiones

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
    public DateTime ScrapedAt { get; set; }        // Fecha del scraping
    public string ScrapingSource { get; set; } = "Ovni Press";
}
```

### **2. Información Específica de Manga**
```csharp
public class OvniPressMangaSpecificData
{
    // Información de la serie
    public string? SeriesTitle { get; set; }       // Título de la serie completa
    public int? VolumeNumber { get; set; }         // Número de volumen
    public bool IsPartOfSeries { get; set; }       // Si pertenece a una serie
    public string? SeriesSlug { get; set; }        // Slug de la serie

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
    public List<string> IncludedExtras { get; set; } // Extras incluidos

    // Información de edición
    public bool IsSpecialEdition { get; set; }     // Si es edición especial
    public string? SpecialEditionType { get; set; } // Tipo de edición especial
    public string? LimitedEditionInfo { get; set; } // Información de edición limitada
}
```

## 🔍 **Algoritmos de Extracción**

### **1. Extracción del Catálogo**
```csharp
public class OvniPressCatalogExtractor
{
    public async Task<List<OvniPressMangaData>> ExtractCatalogAsync(string catalogUrl)
    {
        var mangas = new List<OvniPressMangaData>();
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

    private async Task<List<OvniPressMangaData>> ExtractMangasFromPageAsync(HtmlDocument document)
    {
        var productNodes = document.DocumentNode.SelectNodes(OvniPressSelectors.ProductItem);
        var mangas = new List<OvniPressMangaData>();

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

    private async Task<OvniPressMangaData?> ExtractBasicMangaDataAsync(HtmlNode productNode)
    {
        var linkNode = productNode.SelectSingleNode(OvniPressSelectors.ProductLink);
        if (linkNode == null) return null;

        var url = linkNode.GetAttributeValue("href", "");
        if (string.IsNullOrEmpty(url)) return null;

        var titleNode = productNode.SelectSingleNode(OvniPressSelectors.ProductTitle);
        if (titleNode == null) return null;

        var manga = new OvniPressMangaData
        {
            Title = titleNode.InnerText.Trim(),
            Url = url,
            Slug = ExtractSlugFromUrl(url),
            ScrapedAt = DateTime.UtcNow
        };

        // Extraer precio
        var priceNode = productNode.SelectSingleNode(OvniPressSelectors.ProductPrice);
        if (priceNode != null)
        {
            manga.Price = ParsePrice(priceNode.InnerText);
        }

        // Extraer imagen
        var imageNode = productNode.SelectSingleNode(OvniPressSelectors.ProductImage);
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
public class OvniPressDetailExtractor
{
    public async Task<OvniPressMangaData> ExtractDetailedMangaAsync(string productUrl)
    {
        var document = await _htmlService.LoadPageAsync(productUrl);

        var manga = new OvniPressMangaData
        {
            Url = productUrl,
            Slug = ExtractSlugFromUrl(productUrl),
            ScrapedAt = DateTime.UtcNow
        };

        // Extraer información básica
        manga.Title = ExtractTitle(document);
        manga.CoverUrl = ExtractCoverUrl(document);
        manga.GalleryUrls = ExtractGalleryUrls(document);

        // Extraer precios
        var prices = ExtractPrices(document);
        manga.Price = prices.currentPrice;
        manga.RegularPrice = prices.regularPrice;
        manga.SalePrice = prices.salePrice;
        manga.IsOnSale = prices.isOnSale;

        // Extraer información detallada
        manga.ShortDescription = ExtractShortDescription(document);
        manga.FullDescription = ExtractFullDescription(document);
        manga.Isbn = ExtractIsbn(document);
        manga.Authors = ExtractAuthors(document);
        manga.PublicationDate = ExtractPublicationDate(document);
        manga.PageCount = ExtractPageCount(document);
        manga.Format = ExtractFormat(document);

        // Extraer información específica de manga
        var mangaSpecificData = ExtractMangaSpecificData(document);
        MapMangaDataToManga(manga, mangaSpecificData);

        // Extraer categorías y tags
        manga.Categories = ExtractCategories(document);
        manga.Tags = ExtractTags(document);

        // Verificar disponibilidad
        manga.IsAvailable = CheckAvailability(document);
        manga.StockStatus = GetStockStatus(document);
        manga.StockQuantity = GetStockQuantity(document);

        return manga;
    }

    private void MapMangaDataToManga(OvniPressMangaData manga, OvniPressMangaSpecificData mangaData)
    {
        manga.SeriesTitle = mangaData.SeriesTitle;
        manga.VolumeNumber = mangaData.VolumeNumber;
        manga.IsPartOfSeries = mangaData.IsPartOfSeries;

        if (mangaData.Genres != null)
        {
            manga.Tags.AddRange(mangaData.Genres);
        }

        if (mangaData.IsSpecialEdition)
        {
            manga.Tags.Add("Edición Especial");
        }
    }
}
```

### **3. Extracción de Metadatos Especiales**
```csharp
public class OvniPressMetadataExtractor
{
    public List<string> ExtractAuthors(HtmlDocument document)
    {
        var authors = new List<string>();

        // Buscar en campos personalizados
        var authorNodes = document.DocumentNode.SelectNodes(OvniPressSelectors.AuthorSelector);
        if (authorNodes != null)
        {
            authors.AddRange(authorNodes.Select(n => n.InnerText.Trim()));
        }

        // Buscar en schema.org markup
        var schemaAuthors = ExtractAuthorsFromSchemaOrg(document);
        authors.AddRange(schemaAuthors);

        // Buscar en descripción
        var description = document.DocumentNode.SelectSingleNode(OvniPressSelectors.SingleProductDescription);
        if (description != null)
        {
            authors.AddRange(ExtractAuthorsFromText(description.InnerText));
        }

        return authors.Distinct().ToList();
    }

    public DateTime? ExtractPublicationDate(HtmlDocument document)
    {
        // Buscar en metadatos personalizados
        var dateNode = document.DocumentNode.SelectSingleNode(OvniPressSelectors.PublicationDateSelector);
        if (dateNode != null)
        {
            return ParseDate(dateNode.InnerText);
        }

        // Buscar en schema.org
        var schemaDate = ExtractFromSchemaOrg(document, "datePublished");
        if (schemaDate != null)
        {
            return ParseDate(schemaDate);
        }

        // Buscar en descripción
        var description = document.DocumentNode.SelectSingleNode(OvniPressSelectors.SingleProductDescription);
        if (description != null)
        {
            return ExtractDateFromText(description.InnerText);
        }

        return null;
    }

    public OvniPressMangaSpecificData ExtractMangaSpecificData(HtmlDocument document)
    {
        var data = new OvniPressMangaSpecificData();

        // Extraer información de serie
        data.SeriesTitle = ExtractSeriesTitle(document);
        data.VolumeNumber = ExtractVolumeNumber(document);
        data.IsPartOfSeries = !string.IsNullOrEmpty(data.SeriesTitle);

        // Extraer demografía y géneros
        data.Demographic = ExtractDemographic(document);
        data.Genres = ExtractGenres(document);

        // Extraer información de producción
        data.Translator = ExtractTranslator(document);
        data.Letterer = ExtractLetterer(document);
        data.Proofreader = ExtractProofreader(document);

        // Extraer información de edición especial
        data.IsSpecialEdition = CheckIfSpecialEdition(document);
        data.SpecialEditionType = ExtractSpecialEditionType(document);

        return data;
    }
}
```

## 🔄 **Manejo de Paginación**

### **1. Sistema de Paginación de WooCommerce**
```csharp
public class OvniPressPaginationHandler
{
    public string? ExtractNextPageUrl(HtmlDocument document)
    {
        var nextLink = document.DocumentNode.SelectSingleNode(OvniPressSelectors.NextPage);
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

        var pageLinks = document.DocumentNode.SelectNodes(OvniPressSelectors.PageNumbers);
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
        var paginationText = document.DocumentNode.SelectSingleNode(".woocommerce-result-count");
        if (paginationText != null)
        {
            // Extraer "Mostrando 1-12 de 156 resultados"
            var match = Regex.Match(paginationText.InnerText, @"de (\d+) resultados");
            if (match.Success)
            {
                var totalResults = int.Parse(match.Groups[1].Value);
                return (int)Math.Ceiling(totalResults / 12.0); // 12 productos por página
            }
        }

        return 1;
    }
}
```

## 🖼️ **Manejo de Imágenes**

### **1. Extracción de Carátulas**
```csharp
public class OvniPressImageExtractor
{
    public string? ExtractCoverUrl(HtmlDocument document)
    {
        // Buscar en WooCommerce product gallery
        var galleryImage = document.DocumentNode.SelectSingleNode(OvniPressSelectors.SingleProductImage);
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

        var galleryImages = document.DocumentNode.SelectNodes(OvniPressSelectors.SingleProductGallery);
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
        // WooCommerce usa diferentes tamaños: -100x100.jpg, -300x300.jpg, etc.
        return thumbnailUrl.Replace("-100x100", "")
                          .Replace("-150x150", "")
                          .Replace("-300x300", "")
                          .Replace("-600x600", "");
    }
}
```

## 📊 **Patrones de Contenido**

### **1. Patrones de Título**
```csharp
public class OvniPressTitlePatterns
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
public class OvniPressDescriptionPatterns
{
    public static string? ExtractIsbnFromDescription(string description)
    {
        var isbnPattern = new Regex(@"ISBN\s*:?\s*([0-9\-X]{10,17})", RegexOptions.IgnoreCase);
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
public class OvniPressErrorHandler
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

    public string? GetStockStatus(HtmlDocument document)
    {
        if (!IsProductAvailable(document))
        {
            return "Agotado";
        }

        var stockStatus = document.DocumentNode.SelectSingleNode(".stock");
        return stockStatus?.InnerText?.Trim() ?? "Disponible";
    }

    public int? GetStockQuantity(HtmlDocument document)
    {
        var stockNode = document.DocumentNode.SelectSingleNode(".stock");
        if (stockNode != null)
        {
            var match = Regex.Match(stockNode.InnerText, @"(\d+)");
            if (match.Success)
            {
                return int.Parse(match.Groups[1].Value);
            }
        }

        return null;
    }
}
```

### **2. Contenido Dinámico**
```csharp
public class OvniPressDynamicContentHandler
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
public class OvniPressExtractionMetrics
{
    public int TotalProducts { get; set; }
    public int SuccessfullyExtracted { get; set; }
    public int FailedExtractions { get; set; }
    public double SuccessRate => TotalProducts > 0 ? (double)SuccessfullyExtracted / TotalProducts : 0;

    public Dictionary<string, int> FailureReasons { get; set; } = new();
    public TimeSpan AverageExtractionTime { get; set; }
    public Dictionary<string, int> DataCompleteness { get; set; } = new();

    // Métricas específicas de Ovni Press
    public int SpecialEditions { get; set; }
    public int SeriesWithMultipleVolumes { get; set; }
    public int ManhwaProducts { get; set; }
    public int MangaProducts { get; set; }
}
```

### **2. Validación de Datos**
```csharp
public class OvniPressDataValidator
{
    public List<string> ValidateMangaData(OvniPressMangaData manga)
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
public class OvniPressChangeDetector
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
        var rssUrl = "https://www.ovnipress.net/feed/?post_type=product";
        var xml = await _httpClient.GetStringAsync(rssUrl);

        using var reader = XmlReader.Create(new StringReader(xml));
        return SyndicationFeed.Load(reader);
    }
}
```

### **2. Sync Incremental**
```csharp
public class OvniPressIncrementalSync
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

## 🎯 **Checklist Específico de Ovni Press**

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
<parameter name="filePath">c:\repos\MangaCount\OVNI_PRESS_PUBLISHER_BIBLE.md
