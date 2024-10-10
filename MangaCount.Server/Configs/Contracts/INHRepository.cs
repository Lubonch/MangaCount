using NHibernate.Criterion;
using NHibernate;
using MangaCountServer.Configs.Contracts;

namespace MangaCountServer.Configs
{
    public interface INHRepository<T> : IRepository<T>, BaseRepository<T>
    {
    }
}
