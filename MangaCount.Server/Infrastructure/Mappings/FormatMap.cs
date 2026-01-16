using FluentNHibernate.Mapping;
using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Mappings
{
    public class FormatMap : ClassMap<Format>
    {
        public FormatMap()
        {
            Id(x => x.Id).GeneratedBy.Identity();
            Map(x => x.Name).Column("Name").Length(255).Not.Nullable();
            
            Table("Formats");
        }
    }
}