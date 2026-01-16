using FluentNHibernate.Cfg;
using FluentNHibernate.Cfg.Db;
using NHibernate;
using MangaCount.Server.Infrastructure.Mappings;

namespace MangaCount.Server.Infrastructure.Data
{
    public static class NHibernateHelper
    {
        public static ISessionFactory CreateSessionFactory(string connectionString)
        {
            return Fluently.Configure()
                .Database(MsSqlConfiguration.MsSql2012
                    .ConnectionString(connectionString)
                    .ShowSql())
                .Mappings(m => m.FluentMappings
                    .AddFromAssemblyOf<MangaMap>())
                .BuildSessionFactory();
        }
    }
}