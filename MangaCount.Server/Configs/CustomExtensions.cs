using MangaCountServer.Services.Contracts;
using MangaCountServer.Services;
using MangaCountServer.Repositories.Contracts;
using MangaCountServer.Repositories;

namespace MangaCountServer.Configs
{
    static class CustomExtensions
    {
        public static void AddInjectionServices(IServiceCollection services)
        {
            services.AddScoped<IMangaService, MangaService>();
            services.AddScoped<IEntryService, EntryService>();
        }
        public static void AddInjectionRepositories(IServiceCollection services)
        {
            services.AddScoped<IMangaRepository, MangaRepository>();
            services.AddScoped<IEntryRepository, EntryRepository>();
        }
    }
}
