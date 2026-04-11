using MangaCount.Server.Repositories;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services;
using MangaCount.Server.Services.Contracts;
using Microsoft.Extensions.DependencyInjection;

namespace MangaCount.Server.Configs
{
    public static class CustomExtensions
    {
        public static void AddInjectionServices(IServiceCollection services)
        {
            services.AddScoped<IMangaService, MangaService>();
            services.AddScoped<IEntryService, EntryService>();
            services.AddScoped<IProfileService, ProfileService>();
            services.AddScoped<IPublisherService, PublisherService>();
            services.AddScoped<IFormatService, FormatService>();
            services.AddScoped<IDatabaseService, DatabaseService>();
            services.AddScoped<ILocalRecommendationEngine, LocalRecommendationEngine>();
            services.AddScoped<IRecommendationService, RecommendationService>();

            services.AddHttpClient<GitHubModelsRankingProvider>();
            services.AddTransient<IRecommendationRankingProvider>(serviceProvider => serviceProvider.GetRequiredService<GitHubModelsRankingProvider>());

            services.AddHttpClient<OpenRouterRankingProvider>();
            services.AddTransient<IRecommendationRankingProvider>(serviceProvider => serviceProvider.GetRequiredService<OpenRouterRankingProvider>());
        }
        
        public static void AddInjectionRepositories(IServiceCollection services)
        {
            services.AddScoped<IMangaRepository, MangaRepository>();
            services.AddScoped<IEntryRepository, EntryRepository>();
            services.AddScoped<IProfileRepository, ProfileRepository>();
            services.AddScoped<IPublisherRepository, PublisherRepository>();
            services.AddScoped<IFormatRepository, FormatRepository>();
        }
    }
}
