using MangaCount.Server.Repositories;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services;
using MangaCount.Server.Services.Contracts;
using Microsoft.Extensions.DependencyInjection;

namespace MangaCount.Server.Configs
{
    public class CustomExtensions
    {
        public static void AddInjectionServices(IServiceCollection services)
        {
            services.AddScoped<IMangaService, MangaService>();
            services.AddScoped<IEntryService, EntryService>();
            services.AddScoped<IProfileService, ProfileService>();
        }
        
        public static void AddInjectionRepositories(IServiceCollection services)
        {
            services.AddScoped<IMangaRepository, MangaRepository>();
            services.AddScoped<IEntryRepository, EntryRepository>();
            services.AddScoped<IProfileRepository, ProfileRepository>();
        }
    }
}
