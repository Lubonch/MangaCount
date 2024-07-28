using System.Collections.Generic;

namespace MangaCount.Configs.Contracts
{
    public interface IRepository<T> : BaseRepository<T>
    {
        long Count();
        void Delete(T entity);
        void DeleteAll();
        bool Exists();
        ICollection<T> FindAll();
        T Get(object id);
        T Load(object id);
        T Merge(T entity);
        int Save(T entity);
        void SaveOrUpdate(T entity);
        void Update(T entity);
    }
}
