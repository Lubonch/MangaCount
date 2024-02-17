using MangaCount.Services.Contracts;
using MangaCount.Services;
using MangaCount.Repositories.Contracts;
using MangaCount.Repositories;

namespace MangaCount.Configs
{
    static class CustomExtensions
    {
        public static void AddInjectionServices(IServiceCollection services)
        {
            services.AddScoped<IMangaService, MangaService>();
        }
        public static void AddInjectionRepositories(IServiceCollection services)
        {
            services.AddScoped<IMangaRepository, MangaRepository>();
        }
    }
}
