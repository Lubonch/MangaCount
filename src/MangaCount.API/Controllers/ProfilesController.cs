using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MangaCount.Domain.Entities;
using MangaCount.Infrastructure.Data;

namespace MangaCount.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProfilesController : ControllerBase
{
    private readonly MangaDbContext _context;
    
    public ProfilesController(MangaDbContext context)
    {
        _context = context;
    }
    
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Profile>>> GetProfiles()
    {
        var profiles = await _context.Profiles
            .Include(p => p.MangaCollection)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.CreatedDate,
                p.IsActive,
                MangaCount = p.MangaCollection.Count
            })
            .ToListAsync();
            
        return Ok(profiles);
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<Profile>> GetProfile(int id)
    {
        var profile = await _context.Profiles
            .Include(p => p.MangaCollection)
            .FirstOrDefaultAsync(p => p.Id == id);
            
        if (profile == null)
        {
            return NotFound();
        }
        
        return Ok(profile);
    }
    
    [HttpPost]
    public async Task<ActionResult<Profile>> CreateProfile(CreateProfileRequest request)
    {
        var profile = new Profile
        {
            Name = request.Name,
            CreatedDate = DateTime.UtcNow,
            IsActive = true
        };
        
        _context.Profiles.Add(profile);
        await _context.SaveChangesAsync();
        
        return CreatedAtAction(nameof(GetProfile), new { id = profile.Id }, profile);
    }
    
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProfile(int id, UpdateProfileRequest request)
    {
        var profile = await _context.Profiles.FindAsync(id);
        if (profile == null)
        {
            return NotFound();
        }
        
        profile.Name = request.Name;
        profile.IsActive = request.IsActive;
        
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
    
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProfile(int id)
    {
        var profile = await _context.Profiles.FindAsync(id);
        if (profile == null)
        {
            return NotFound();
        }
        
        _context.Profiles.Remove(profile);
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
}

public class CreateProfileRequest
{
    public required string Name { get; set; }
}

public class UpdateProfileRequest
{
    public required string Name { get; set; }
    public bool IsActive { get; set; }
}