using FluentNHibernate.Mapping;
using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Mappings
{
    public class EntryMap : ClassMap<Entry>
    {
        public EntryMap()
        {
            Id(x => x.Id).GeneratedBy.Identity();
            Map(x => x.MangaId).Column("MangaId").Not.Nullable();
            Map(x => x.ProfileId).Column("ProfileId").Not.Nullable();
            Map(x => x.Quantity).Column("Quantity").Not.Nullable();
            Map(x => x.Pending).Column("Pending").Length(500).Nullable();
            Map(x => x.Priority).Column("Priority").Not.Nullable();
            
            References(x => x.Manga)
                .Column("MangaId")
                .LazyLoad()
                .Not.Nullable();
                
            References(x => x.Profile)
                .Column("ProfileId")
                .LazyLoad()
                .Not.Nullable();
                
            Table("Entry");
        }
    }
}