using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MangaCount.Domain.Entities;
using MangaCount.Infrastructure.Data;
using MangaCount.Application.Services;

namespace MangaCount.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MangaController : ControllerBase
{
    private readonly MangaDbContext _context;
    private readonly TsvImportService _tsvImportService;
    
    public MangaController(MangaDbContext context, TsvImportService tsvImportService)
    {
        _context = context;
        _tsvImportService = tsvImportService;
    }
    
    [HttpGet("profile/{profileId}")]
    public async Task<ActionResult<IEnumerable<Manga>>> GetMangaByProfile(int profileId, [FromQuery] string? search = null, [FromQuery] bool? incomplete = null)
    {
        var query = _context.Manga.Where(m => m.ProfileId == profileId);
        
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(m => m.Title.Contains(search) || m.Publisher.Contains(search));
        }
        
        if (incomplete.HasValue)
        {
            if (incomplete.Value)
            {
                query = query.Where(m => !m.Complete);
            }
            else
            {
                query = query.Where(m => m.Complete);
            }
        }
        
        var manga = await query.OrderBy(m => m.Title).ToListAsync();
        return Ok(manga);
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<Manga>> GetManga(int id)
    {
        var manga = await _context.Manga.FindAsync(id);
        if (manga == null)
        {
            return NotFound();
        }
        
        return Ok(manga);
    }
    
    [HttpPost]
    public async Task<ActionResult<Manga>> CreateManga(CreateMangaRequest request)
    {
        var manga = new Manga
        {
            ProfileId = request.ProfileId,
            Title = request.Title,
            Purchased = request.Purchased,
            Total = request.Total,
            Pending = request.Pending ?? string.Empty,
            Complete = request.Complete,
            Priority = request.Priority,
            Format = request.Format ?? "Unknown",
            Publisher = request.Publisher ?? "Unknown",
            ImageUrl = request.ImageUrl,
            CreatedDate = DateTime.UtcNow
        };
        
        _context.Manga.Add(manga);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetManga), new { id = manga.Id }, manga);
    }
    
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateManga(int id, UpdateMangaRequest request)
    {
        var manga = await _context.Manga.FindAsync(id);
        if (manga == null)
        {
            return NotFound();
        }
        
        manga.Title = request.Title;
        manga.Purchased = request.Purchased;
        manga.Total = request.Total;
        manga.Pending = request.Pending ?? string.Empty;
        manga.Complete = request.Complete;
        manga.Priority = request.Priority;
        manga.Format = request.Format ?? "Unknown";
        manga.Publisher = request.Publisher ?? "Unknown";
        manga.ImageUrl = request.ImageUrl;
        manga.UpdatedDate = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
    
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteManga(int id)
    {
        var manga = await _context.Manga.FindAsync(id);
        if (manga == null)
        {
            return NotFound();
        }
        
        _context.Manga.Remove(manga);
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
    
    [HttpPost("profile/{profileId}/import-tsv")]
    public async Task<ActionResult<ImportResult>> ImportTsv(int profileId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded");
        }
        
        // Save uploaded file temporarily
        var tempFilePath = Path.GetTempFileName();
        try
        {
            using (var stream = new FileStream(tempFilePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }
            
            var (mangaList, errors) = await _tsvImportService.ImportFromTsvAsync(tempFilePath, profileId);
            
            if (mangaList.Any())
            {
                _context.Manga.AddRange(mangaList);
                await _context.SaveChangesAsync();
            }
            
            return Ok(new ImportResult
            {
                ImportedCount = mangaList.Count,
                Errors = errors,
                Success = errors.Count == 0
            });
        }
        finally
        {
            if (System.IO.File.Exists(tempFilePath))
            {
                System.IO.File.Delete(tempFilePath);
            }
        }
    }
    
    [HttpGet("profile/{profileId}/export-tsv")]
    public async Task<ActionResult> ExportTsv(int profileId)
    {
        var mangaList = await _context.Manga.Where(m => m.ProfileId == profileId).ToListAsync();
        var tsvContent = await _tsvImportService.ExportToTsvAsync(mangaList);
        
        var profile = await _context.Profiles.FindAsync(profileId);
        var fileName = $"{profile?.Name ?? "Unknown"}_manga_collection.tsv";
        
        return File(System.Text.Encoding.UTF8.GetBytes(tsvContent), "text/tab-separated-values", fileName);
    }
    
    [HttpGet("profile/{profileId}/stats")]
    public async Task<ActionResult<CollectionStats>> GetCollectionStats(int profileId)
    {
        var mangaList = await _context.Manga.Where(m => m.ProfileId == profileId).ToListAsync();
        
        var stats = new CollectionStats
        {
            TotalSeries = mangaList.Count,
            CompleteSeries = mangaList.Count(m => m.Complete),
            IncompleteSeries = mangaList.Count(m => !m.Complete),
            TotalVolumes = mangaList.Sum(m => m.Purchased),
            HighPrioritySeries = mangaList.Count(m => m.Priority),
            UniquePublishers = mangaList.Select(m => m.Publisher).Distinct().Count(),
            FormatDistribution = mangaList.GroupBy(m => m.Format).ToDictionary(g => g.Key, g => g.Count())
        };
        
        return Ok(stats);
    }
}

public class CreateMangaRequest
{
    public int ProfileId { get; set; }
    public required string Title { get; set; }
    public int Purchased { get; set; }
    public required string Total { get; set; }
    public string? Pending { get; set; }
    public bool Complete { get; set; }
    public bool Priority { get; set; }
    public string? Format { get; set; }
    public string? Publisher { get; set; }
    public string? ImageUrl { get; set; }
}

public class UpdateMangaRequest
{
    public required string Title { get; set; }
    public int Purchased { get; set; }
    public required string Total { get; set; }
    public string? Pending { get; set; }
    public bool Complete { get; set; }
    public bool Priority { get; set; }
    public string? Format { get; set; }
    public string? Publisher { get; set; }
    public string? ImageUrl { get; set; }
}

public class ImportResult
{
    public int ImportedCount { get; set; }
    public List<string> Errors { get; set; } = new();
    public bool Success { get; set; }
}

public class CollectionStats
{
    public int TotalSeries { get; set; }
    public int CompleteSeries { get; set; }
    public int IncompleteSeries { get; set; }
    public int TotalVolumes { get; set; }
    public int HighPrioritySeries { get; set; }
    public int UniquePublishers { get; set; }
    public Dictionary<string, int> FormatDistribution { get; set; } = new();
}