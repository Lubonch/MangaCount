using NHibernate;
using MangaCount.Server.Domain;
using NHibernateSession = NHibernate.ISession;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public class PublisherRepository : IPublisherRepository
    {
        private readonly NHibernateSession _session;

        public PublisherRepository(NHibernateSession session)
        {
            _session = session;
        }

        public Publisher? GetById(int id)
        {
            return _session.Get<Publisher>(id);
        }

        public IEnumerable<Publisher> GetAll()
        {
            return _session.Query<Publisher>()
                .OrderBy(p => p.Name)
                .ToList();
        }

        public Publisher Save(Publisher publisher)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.SaveOrUpdate(publisher);
                transaction.Commit();
                return publisher;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public void Delete(Publisher publisher)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.Delete(publisher);
                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
    }
}