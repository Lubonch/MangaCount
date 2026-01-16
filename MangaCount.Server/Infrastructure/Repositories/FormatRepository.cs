using NHibernate;
using MangaCount.Server.Domain;
using NHibernateSession = NHibernate.ISession;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public class FormatRepository : IFormatRepository
    {
        private readonly NHibernateSession _session;

        public FormatRepository(NHibernateSession session)
        {
            _session = session;
        }

        public Format? GetById(int id)
        {
            return _session.Get<Format>(id);
        }

        public IEnumerable<Format> GetAll()
        {
            return _session.Query<Format>()
                .OrderBy(f => f.Name)
                .ToList();
        }

        public Format Save(Format format)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.SaveOrUpdate(format);
                transaction.Commit();
                return format;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public void Delete(Format format)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.Delete(format);
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