using System.Collections.Generic;
using FluentNHibernate.Data;
using MangaCount.Configs;
using MangaCount.Configs.Contracts;
using NHibernate;
using NHibernate.Criterion; 

namespace MangaCount.Configs
{
    public class NHRepository<T> : BaseNHRepository, INHRepository<T>, IRepository<T>, BaseRepository<T> where T : class
    {
        public NHRepository() 
        {
           
        }

        public long Count()
        {
            return Session.QueryOver<T>()
                .Select(Projections.RowCount())
                .FutureValue<int>()
                .Value;
        }

        public void Delete(T entity)
        {
            Session.Delete(entity);
        }

        public void DeleteAll()
        {
            throw new NotImplementedException();
        }

        public bool Exists()
        {
            throw new NotImplementedException();
        }

        public ICollection<T> FindAll()
        {
            return Session.Query<T>().ToList();
        }

        public T Get(object id)
        {
            return Session.Get<T>(id);
        }

        public T Load(object id)
        {
            return (T)Session.Load<T>(id);
        }

        public T Merge(T entity)
        {
            return (T)Session.Merge<T>(entity);
        }

        public int Save(T entity)
        {
            return (int)Session.Save(entity);
        }

        public void SaveOrUpdate(T entity)
        {
            Session.SaveOrUpdate(entity);
        }

        public void Update(T entity)
        {
            Session.Update(entity);
        }
    }
}
