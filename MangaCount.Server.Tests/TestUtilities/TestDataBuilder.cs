using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using MangaCount.Server.Model;

namespace MangaCount.Server.Tests.TestUtilities
{
    public static class TestDataBuilder
    {
        public static Profile CreateTestProfile(int id = 1, string name = "Test Profile")
        {
            return new Profile
            {
                Id = id,
                Name = name,
                ProfilePicture = null,
                CreatedDate = DateTime.UtcNow,
                IsActive = true
            };
        }

        public static ProfileModel CreateTestProfileModel(int id = 1, string name = "Test Profile")
        {
            return new ProfileModel
            {
                Id = id,
                Name = name,
                ProfilePicture = null,
                CreatedDate = DateTime.UtcNow,
                IsActive = true
            };
        }

        public static ProfileDTO CreateTestProfileDTO(int id = 1, string name = "Test Profile")
        {
            return new ProfileDTO
            {
                Id = id,
                Name = name,
                ProfilePicture = null,
                CreatedDate = DateTime.UtcNow,
                IsActive = true
            };
        }

        public static Manga CreateTestManga(int id = 1, string name = "Test Manga", int? volumes = 10)
        {
            return new Manga
            {
                Id = id,
                Name = name,
                Volumes = volumes
            };
        }

        public static MangaModel CreateTestMangaModel(int id = 1, string name = "Test Manga", int? volumes = 10)
        {
            return new MangaModel
            {
                Id = id,
                Name = name,
                Volumes = volumes
            };
        }

        public static MangaDTO CreateTestMangaDTO(int id = 1, string name = "Test Manga", int? volumes = 10)
        {
            return new MangaDTO
            {
                Id = id,
                Name = name,
                Volumes = volumes
            };
        }

        public static Entry CreateTestEntry(int id = 1, string mangaName = "Test Manga", int profileId = 1, int quantity = 5)
        {
            return new Entry
            {
                Id = id,
                Manga = CreateTestManga(id, mangaName),
                MangaId = id,
                ProfileId = profileId,
                Quantity = quantity,
                Pending = null,
                Priority = false
            };
        }

        public static EntryModel CreateTestEntryModel(int id = 1, string mangaName = "Test Manga", int profileId = 1, int quantity = 5)
        {
            return new EntryModel
            {
                Id = id,
                Manga = CreateTestManga(id, mangaName),
                MangaId = id,
                ProfileId = profileId,
                Quantity = quantity,
                Pending = null,
                Priority = false
            };
        }

        public static EntryDTO CreateTestEntryDTO(int id = 1, string mangaName = "Test Manga", int profileId = 1, int quantity = 5)
        {
            return new EntryDTO
            {
                Id = id,
                Manga = CreateTestManga(id, mangaName),
                MangaId = id,
                ProfileId = profileId,
                Quantity = quantity,
                Pending = null,
                Priority = false
            };
        }
    }
}