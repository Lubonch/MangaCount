using FluentNHibernate.Mapping;
using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Mappings
{
    public class MangaMap : ClassMap<Manga>
    {
        public MangaMap()
        {
            Id(x => x.Id).GeneratedBy.Identity();
            Map(x => x.Name).Column("Name").Length(255).Not.Nullable();
            Map(x => x.Volumes).Column("Volumes").Nullable();
            Map(x => x.FormatId).Column("FormatId").Not.Nullable();
            Map(x => x.PublisherId).Column("PublisherId").Not.Nullable();
            
            References(x => x.Format)
                .Column("FormatId")
                .LazyLoad()
                .Not.Nullable();
                
            References(x => x.Publisher)
                .Column("PublisherId")
                .LazyLoad()
                .Not.Nullable();
                
            Table("Manga");
        }
    }
}