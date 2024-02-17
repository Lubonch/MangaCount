using FluentNHibernate.Mapping;
using MangaCount.Domain;

namespace MangaCount.Repositories.Mappings
{
    public class EntryMap : ClassMap<Domain.Entry>
    {
        public EntryMap() 
        {
            Id(x => x.Id).Column("Id");
            Map(x => x.Priority).Column("Priority");
            Map(x => x.Pending).Column("Pending");
            Map(x => x.Quantity).Column("Quantity");
            References(x => x.Manga).Column("MangaId");            
        }
    }
}
