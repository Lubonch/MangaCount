using FluentNHibernate.Mapping;
using MangaCount.Server.Domain;

namespace MangaCount.Server.Infrastructure.Mappings
{
    public class ProfileMap : ClassMap<Profile>
    {
        public ProfileMap()
        {
            Id(x => x.Id).GeneratedBy.Identity();
            Map(x => x.Name).Column("Name").Length(255).Not.Nullable();
            Map(x => x.ProfilePicture).Column("ProfilePicture").Length(500).Nullable();
            Map(x => x.CreatedDate).Column("CreatedDate").Not.Nullable();
            Map(x => x.IsActive).Column("IsActive").Not.Nullable();
            
            Table("Profiles");
        }
    }
}