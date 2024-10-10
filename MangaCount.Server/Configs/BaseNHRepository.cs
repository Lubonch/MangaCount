using NHibernate;

namespace MangaCountServer.Configs
{
    public abstract class BaseNHRepository
    {
        public static string _sessionFactoryName;

        public BaseNHRepository()
        {
            Session = NhibernateConfig.OpenSession();
        }
        public BaseNHRepository(string sessionFactoryName)
        {
        }

        protected virtual NHibernate.ISession Session { get; }

        protected virtual ISessionFactory GetSessionFactory()
        {
            throw new NotImplementedException();
        }
    }
}
