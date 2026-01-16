using NHibernate;
using MangaCount.Server.Domain;
using NHibernateSession = NHibernate.ISession;

namespace MangaCount.Server.Infrastructure.Repositories
{
    public class ProfileRepository : IProfileRepository
    {
        private readonly NHibernateSession _session;

        public ProfileRepository(NHibernateSession session)
        {
            _session = session;
        }

        public Profile? GetById(int id)
        {
            return _session.Get<Profile>(id);
        }

        public IEnumerable<Profile> GetAll()
        {
            return _session.Query<Profile>()
                .Where(p => p.IsActive)
                .OrderBy(p => p.Name)
                .ToList();
        }

        public Profile Save(Profile profile)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                _session.SaveOrUpdate(profile);
                transaction.Commit();
                return profile;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public void Delete(Profile profile)
        {
            using var transaction = _session.BeginTransaction();
            try
            {
                profile.IsActive = false;
                _session.SaveOrUpdate(profile);
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