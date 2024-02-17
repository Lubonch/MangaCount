using FluentNHibernate.Mapping;
using MangaCount.Domain;

namespace MangaCount.Repositories.Mappings
{
    public class MangaMap : ClassMap<Domain.Manga>
    {
        public MangaMap() 
        {
            Id(x => x.Id).Column("Id");
            Map(x => x.Name).Column("Name");
            Map(x => x.Volumes).Column("Volumes");            
        }
    }
}
