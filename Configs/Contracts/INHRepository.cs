using NHibernate.Criterion;
using NHibernate;
using MangaCount.Configs.Contracts;

namespace MangaCount.Configs
{
    public interface INHRepository<T> : IRepository<T>, BaseRepository<T>
    {
    }
}
