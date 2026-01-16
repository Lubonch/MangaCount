using NHibernate;
using MangaCount.Server.Domain;
using NHibernateSession = NHibernate.ISession;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public class MangaRepository : IMangaRepository
    {
        private readonly NHibernateSession _session;

        public MangaRepository(NHibernateSession session)
        {
            _session = session;
        }

        public Manga? GetById(int id)
        {
            return _session.Get<Manga>(id);
        }

        public IEnumerable<Manga> GetAll()
        {
            return _session.Query<Manga>()
                .ToList()
                .Select(m => 
                {
                    // Force load relationships
                    NHibernateUtil.Initialize(m.Format);
                    NHibernateUtil.Initialize(m.Publisher);
                    return m;
                });
        }

        public Manga Save(Manga manga)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.SaveOrUpdate(manga);
                transaction.Commit();
                return manga;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public void Delete(Manga manga)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.Delete(manga);
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