using Microsoft.EntityFrameworkCore;
using MangaCount.Domain.Entities;

namespace MangaCount.Infrastructure.Data;

public class MangaDbContext : DbContext
{
    public MangaDbContext(DbContextOptions<MangaDbContext> options) : base(options) { }
    
    public DbSet<Profile> Profiles { get; set; }
    public DbSet<Manga> Manga { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Configure Profile entity
        modelBuilder.Entity<Profile>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.CreatedDate).IsRequired();
            entity.Property(e => e.IsActive).IsRequired();
            
            // Configure relationship
            entity.HasMany(e => e.MangaCollection)
                  .WithOne(m => m.Profile)
                  .HasForeignKey(m => m.ProfileId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
        
        // Configure Manga entity
        modelBuilder.Entity<Manga>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Total).HasMaxLength(20);
            entity.Property(e => e.Pending).HasMaxLength(500);
            entity.Property(e => e.Format).HasMaxLength(50);
            entity.Property(e => e.Publisher).HasMaxLength(100);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.CreatedDate).IsRequired();
            
            // Index for better performance
            entity.HasIndex(e => e.ProfileId);
            entity.HasIndex(e => e.Title);
        });
        
        // Seed initial data
        modelBuilder.Entity<Profile>().HasData(
            new Profile { Id = 1, Name = "Lucas", CreatedDate = DateTime.UtcNow, IsActive = true }
        );
    }
}
