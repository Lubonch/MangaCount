using FluentNHibernate.Cfg.Db;
using FluentNHibernate.Cfg;
using NHibernate;
using NHibernate.Cfg;
using System.Configuration;
using NHibernate.Tool.hbm2ddl;
using System.Data.SqlClient;

namespace MangaCount.Configs
{
    public class NhibernateConfig
    {
        private static ISessionFactory _sessionFactory;

        private static ISessionFactory SessionFactory
        {
            get
            {
                if (_sessionFactory == null)
                    InitializeSessionFactory(); return _sessionFactory;
            }
        }
        private static void InitializeSessionFactory()
        {
            IConfigurationRoot _configuration = new ConfigurationBuilder()
            .SetBasePath("D:\\repos\\MangaCount")
            .AddJsonFile("appsettings.json")
            .Build();

            string connectionString = _configuration.GetConnectionString("MangaCountDatabase");
            _sessionFactory = Fluently.Configure()
                             .Database(MsSqlConfiguration.MsSql2012.ConnectionString(connectionString))
                             .Mappings(m => m.FluentMappings
                             .AddFromAssemblyOf<Program>())
                             .ExposeConfiguration(cfg => new SchemaExport(cfg)
                             .Create(false, false))
                             .BuildSessionFactory();                             ;
        }

        public static NHibernate.ISession OpenSession()
        {
            return SessionFactory.OpenSession();
        }
    }
}
