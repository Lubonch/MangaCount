using FluentNHibernate.Mapping;
using MangaCountServer.Domain;

namespace MangaCountServer.Repositories.Mappings
{
    public class MangaMap : ClassMap<Domain.Manga>
    {
        public MangaMap() 
        {
            Table("Manga");
            Id(x => x.Id).Column("Id").GeneratedBy.Identity();
            Map(x => x.Name).Column("Name");
            Map(x => x.Volumes).Column("Volumes");            
        }
    }
}
