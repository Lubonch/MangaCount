using FluentNHibernate.Cfg;
using FluentNHibernate.Cfg.Db;
using NHibernate;
using MangaCount.Server.Infrastructure.Mappings;
using MangaCount.Server.Infrastructure.Repositories;
using MangaCount.Server.Application;
using NHibernateSession = NHibernate.ISession;

namespace MangaCount.Server.Configs
{
    public static class CustomExtensions
    {
        public static void AddNHibernate(this IServiceCollection services, string connectionString)
        {
            services.AddSingleton<ISessionFactory>(provider =>
            {
                return Fluently.Configure()
                    .Database(MsSqlConfiguration.MsSql2012
                        .ConnectionString(connectionString)
                        .ShowSql())
                    .Mappings(m => m.FluentMappings
                        .AddFromAssemblyOf<MangaMap>())
                    .BuildSessionFactory();
            });

            services.AddScoped<NHibernateSession>(provider =>
                provider.GetService<ISessionFactory>()!.OpenSession());
        }

        public static void AddInjectionServices(this IServiceCollection services)
        {
            services.AddScoped<IMangaService, MangaService>();
            services.AddScoped<IEntryService, EntryService>();
            services.AddScoped<IProfileService, ProfileService>();
            services.AddScoped<IPublisherService, PublisherService>();
            services.AddScoped<IFormatService, FormatService>();
            services.AddScoped<IDatabaseService, DatabaseService>();
        }
        
        public static void AddInjectionRepositories(this IServiceCollection services)
        {
            services.AddScoped<IMangaRepository, MangaRepository>();
            services.AddScoped<IEntryRepository, EntryRepository>();
            services.AddScoped<IProfileRepository, ProfileRepository>();
            services.AddScoped<IPublisherRepository, PublisherRepository>();
            services.AddScoped<IFormatRepository, FormatRepository>();
        }
    }
}