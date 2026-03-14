using CsvHelper;
using CsvHelper.Configuration;
using MangaCount.Domain.Entities;
using System.Globalization;
using System.Text;

namespace MangaCount.Application.Services;

public class TsvImportService
{
    public async Task<(List<Manga> MangaList, List<string> Errors)> ImportFromTsvAsync(string filePath, int profileId)
    {
        var mangaList = new List<Manga>();
        var errors = new List<string>();
        
        try
        {
            using var reader = new StringReader(await File.ReadAllTextAsync(filePath, Encoding.UTF8));
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                Delimiter = "\t", // TSV format
                HasHeaderRecord = true,
                MissingFieldFound = null, // Ignore missing fields
                BadDataFound = null // Ignore bad data
            });
            
            csv.Read();
            csv.ReadHeader();
            
            int rowNumber = 1;
            while (csv.Read())
            {
                rowNumber++;
                try
                {
                    var manga = new Manga
                    {
                        ProfileId = profileId,
                        Title = GetFieldValue(csv, "Titulo", ""),
                        Purchased = int.TryParse(GetFieldValue(csv, "Comprados", "0"), out var purchased) ? purchased : 0,
                        Total = GetFieldValue(csv, "Total", ""),
                        Pending = GetFieldValue(csv, "Pendiente(No consecutivos)", ""),
                        Complete = ParseBoolean(GetFieldValue(csv, "Completa", "FALSE")),
                        Priority = ParseBoolean(GetFieldValue(csv, "Prioridad", "FALSE")),
                        Format = GetFieldValue(csv, "Formato", "Unknown"),
                        Publisher = GetFieldValue(csv, "Editorial", "Unknown"),
                        CreatedDate = DateTime.UtcNow
                    };
                    
                    // Validate required fields
                    if (string.IsNullOrWhiteSpace(manga.Title))
                    {
                        errors.Add($"Row {rowNumber}: Title is required");
                        continue;
                    }
                    
                    mangaList.Add(manga);
                }
                catch (Exception ex)
                {
                    errors.Add($"Row {rowNumber}: Error parsing data - {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            errors.Add($"File reading error: {ex.Message}");
        }
        
        return (mangaList, errors);
    }
    
    private static string GetFieldValue(CsvReader csv, string fieldName, string defaultValue)
    {
        try
        {
            return csv.GetField(fieldName)?.Trim() ?? defaultValue;
        }
        catch
        {
            return defaultValue;
        }
    }
    
    private static bool ParseBoolean(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;
            
        return value.Trim().ToUpperInvariant() switch
        {
            "TRUE" => true,
            "FALSE" => false,
            "1" => true,
            "0" => false,
            _ => false
        };
    }
    
    public async Task<string> ExportToTsvAsync(List<Manga> mangaList)
    {
        var sb = new StringBuilder();
        
        // Header
        sb.AppendLine("Titulo\tComprados\tTotal\tPendiente(No consecutivos)\tCompleta\tPrioridad\tFormato\tEditorial");
        
        // Data rows
        foreach (var manga in mangaList)
        {
            sb.AppendLine($"{manga.Title}\t{manga.Purchased}\t{manga.Total}\t{manga.Pending}\t{manga.Complete}\t{manga.Priority}\t{manga.Format}\t{manga.Publisher}");
        }
        
        return sb.ToString();
    }
}