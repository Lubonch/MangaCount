using NHibernate;
using MangaCount.Server.Domain;
using NHibernateSession = NHibernate.ISession;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public class EntryRepository : IEntryRepository
    {
        private readonly NHibernateSession _session;

        public EntryRepository(NHibernateSession session)
        {
            _session = session;
        }

        public Entry? GetById(int id)
        {
            return _session.Get<Entry>(id);
        }

        public IEnumerable<Entry> GetAll(int? profileId = null)
        {
            var query = _session.Query<Entry>();

            if (profileId.HasValue)
            {
                query = query.Where(e => e.ProfileId == profileId.Value);
            }

            return query.ToList()
                .Select(e => 
                {
                    // Force load relationships
                    NHibernateUtil.Initialize(e.Manga);
                    if (e.Manga != null)
                    {
                        NHibernateUtil.Initialize(e.Manga.Format);
                        NHibernateUtil.Initialize(e.Manga.Publisher);
                    }
                    return e;
                });
        }

        public IEnumerable<Entry> GetByProfileId(int profileId)
        {
            return _session.Query<Entry>()
                .Where(e => e.ProfileId == profileId)
                .ToList()
                .Select(e => 
                {
                    // Force load relationships
                    NHibernateUtil.Initialize(e.Manga);
                    if (e.Manga != null)
                    {
                        NHibernateUtil.Initialize(e.Manga.Format);
                        NHibernateUtil.Initialize(e.Manga.Publisher);
                    }
                    return e;
                });
        }

        public Entry Save(Entry entry)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.SaveOrUpdate(entry);
                transaction.Commit();
                return entry;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public void Delete(Entry entry)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.Delete(entry);
                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public IEnumerable<dynamic> GetUsedFormats(int? profileId = null)
        {
            var query = _session.Query<Entry>()
                .Where(e => profileId == null || e.ProfileId == profileId.Value)
                .Join(_session.Query<Manga>(), e => e.MangaId, m => m.Id, (e, m) => m)
                .Join(_session.Query<Format>(), m => m.FormatId, f => f.Id, (m, f) => new { f.Id, f.Name })
                .Distinct();

            return query.ToList();
        }

        public IEnumerable<dynamic> GetUsedPublishers(int? profileId = null)
        {
            var query = _session.Query<Entry>()
                .Where(e => profileId == null || e.ProfileId == profileId.Value)
                .Join(_session.Query<Manga>(), e => e.MangaId, m => m.Id, (e, m) => m)
                .Join(_session.Query<Publisher>(), m => m.PublisherId, p => p.Id, (m, p) => new { p.Id, p.Name })
                .Distinct();

            return query.ToList();
        }

        public void DeleteAllByProfile(int profileId)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                var entries = _session.Query<Entry>()
                    .Where(e => e.ProfileId == profileId)
                    .ToList();

                foreach (var entry in entries)
                {
                    _session.Delete(entry);
                }

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