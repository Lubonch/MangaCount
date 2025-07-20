using FluentAssertions;
using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services;
using Microsoft.AspNetCore.Http;
using Moq;
using System.Net;
using System.Text;
using Xunit;

namespace MangaCount.Server.Tests.Services
{
    public class EntryServiceTests
    {
        private readonly Mock<IEntryRepository> _mockEntryRepository;
        private readonly Mock<IMangaRepository> _mockMangaRepository;
        private readonly EntryService _service;

        public EntryServiceTests()
        {
            _mockEntryRepository = new Mock<IEntryRepository>();
            _mockMangaRepository = new Mock<IMangaRepository>();
            _service = new EntryService(_mockEntryRepository.Object, _mockMangaRepository.Object);
        }

        [Fact]
        public void GetAllEntries_WithoutProfileId_ShouldReturnAllEntries()
        {
            // Arrange
            var entries = new List<Entry>
            {
                CreateTestEntry(1, "One Piece", 1),
                CreateTestEntry(2, "Naruto", 2)
            };
            _mockEntryRepository.Setup(r => r.GetAllEntries(null)).Returns(entries);

            // Act
            var result = _service.GetAllEntries();

            // Assert
            result.Should().HaveCount(2);
            result[0].Manga.Name.Should().Be("One Piece");
            result[1].Manga.Name.Should().Be("Naruto");
            _mockEntryRepository.Verify(r => r.GetAllEntries(null), Times.Once);
        }

        [Fact]
        public void GetAllEntries_WithProfileId_ShouldReturnFilteredEntries()
        {
            // Arrange
            var profileId = 1;
            var entries = new List<Entry>
            {
                CreateTestEntry(1, "One Piece", profileId)
            };
            _mockEntryRepository.Setup(r => r.GetAllEntries(profileId)).Returns(entries);

            // Act
            var result = _service.GetAllEntries(profileId);

            // Assert
            result.Should().HaveCount(1);
            result[0].ProfileId.Should().Be(profileId);
            _mockEntryRepository.Verify(r => r.GetAllEntries(profileId), Times.Once);
        }

        [Fact]
        public void GetEntryById_WithValidId_ShouldReturnMappedEntry()
        {
            // Arrange
            var entryId = 1;
            var entry = CreateTestEntry(entryId, "Dragon Ball", 1);
            _mockEntryRepository.Setup(r => r.GetById(entryId)).Returns(entry);

            // Act
            var result = _service.GetEntryById(entryId);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().Be(entryId);
            result.Manga.Name.Should().Be("Dragon Ball");
            _mockEntryRepository.Verify(r => r.GetById(entryId), Times.Once);
        }

        [Fact]
        public void GetEntryById_WithInvalidId_ShouldReturnNull()
        {
            // Arrange
            _mockEntryRepository.Setup(r => r.GetById(999)).Returns((Entry?)null);

            // Act
            var result = _service.GetEntryById(999);

            // Assert
            result.Should().BeNull();
            _mockEntryRepository.Verify(r => r.GetById(999), Times.Once);
        }

        [Fact]
        public async Task ImportFromFileAsync_WithValidTsvFile_ShouldProcessSuccessfully()
        {
            // Arrange
            var profileId = 1;
            var content = "Manga Name\tQuantity\tVolumes\tPending\t\tPriority\nOne Piece\t5\t100\t\t\tfalse";
            var fileName = "test.tsv";
            var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
            var file = new FormFile(stream, 0, stream.Length, "file", fileName);

            var existingManga = new Manga { Id = 1, Name = "One Piece", Volumes = 100 };
            _mockMangaRepository.Setup(r => r.GetAllMangas()).Returns(new List<Manga> { existingManga });
            _mockEntryRepository.Setup(r => r.Create(It.IsAny<Entry>())).Returns(CreateTestEntry(1, "One Piece", profileId));

            // Act
            var result = await _service.ImportFromFileAsync(file, profileId);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.OK);
            _mockEntryRepository.Verify(r => r.Create(It.IsAny<Entry>()), Times.Once);
        }

        [Fact]
        public async Task ImportFromFileAsync_WithInvalidFileType_ShouldThrowException()
        {
            // Arrange
            var profileId = 1;
            var content = "test content";
            var fileName = "test.txt";
            var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
            var file = new FormFile(stream, 0, stream.Length, "file", fileName);

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => 
                _service.ImportFromFileAsync(file, profileId));
        }

        [Fact]
        public void SaveOrUpdate_WithNewEntry_ShouldCallCreate()
        {
            // Arrange
            var entryDTO = new EntryDTO 
            { 
                Id = 0,
                Manga = new Manga { Id = 1, Name = "New Manga", Volumes = 10 },
                MangaId = 1,
                ProfileId = 1,
                Quantity = 5,
                Priority = false
            };
            var createdEntry = CreateTestEntry(1, "New Manga", 1);
            _mockEntryRepository.Setup(r => r.Create(It.IsAny<Entry>())).Returns(createdEntry);

            // Act
            var result = _service.SaveOrUpdate(entryDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.OK);
            _mockEntryRepository.Verify(r => r.Create(It.IsAny<Entry>()), Times.Once);
            _mockEntryRepository.Verify(r => r.Update(It.IsAny<Entry>()), Times.Never);
        }

        [Fact]
        public void SaveOrUpdate_WithExistingEntry_ShouldCallUpdate()
        {
            // Arrange
            var entryDTO = new EntryDTO 
            { 
                Id = 1,
                Manga = new Manga { Id = 1, Name = "Updated Manga", Volumes = 10 },
                MangaId = 1,
                ProfileId = 1,
                Quantity = 10,
                Priority = true
            };
            var updatedEntry = CreateTestEntry(1, "Updated Manga", 1);
            _mockEntryRepository.Setup(r => r.Update(It.IsAny<Entry>())).Returns(updatedEntry);

            // Act
            var result = _service.SaveOrUpdate(entryDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.OK);
            _mockEntryRepository.Verify(r => r.Update(It.IsAny<Entry>()), Times.Once);
            _mockEntryRepository.Verify(r => r.Create(It.IsAny<Entry>()), Times.Never);
        }

        [Fact]
        public void SaveOrUpdate_WhenRepositoryReturnsNull_ShouldReturnForbidden()
        {
            // Arrange
            var entryDTO = new EntryDTO 
            { 
                Id = 0,
                Manga = new Manga { Id = 1, Name = "New Manga", Volumes = 10 },
                MangaId = 1,
                ProfileId = 1,
                Quantity = 5,
                Priority = false
            };
            _mockEntryRepository.Setup(r => r.Create(It.IsAny<Entry>())).Returns((Entry?)null);

            // Act
            var result = _service.SaveOrUpdate(entryDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            _mockEntryRepository.Verify(r => r.Create(It.IsAny<Entry>()), Times.Once);
        }

        [Fact]
        public void GetSharedManga_WithTwoProfiles_ShouldReturnSharedEntries()
        {
            // Arrange
            var profileId1 = 1;
            var profileId2 = 2;
            var entries = new List<Entry>
            {
                CreateTestEntry(1, "One Piece", profileId1, 5),
                CreateTestEntry(2, "One Piece", profileId2, 3),
                CreateTestEntry(3, "Naruto", profileId1, 10)
            };
            entries[0].MangaId = 1;
            entries[1].MangaId = 1; // Same manga
            entries[2].MangaId = 2; // Different manga

            _mockEntryRepository.Setup(r => r.GetEntriesByProfileIds(profileId1, profileId2)).Returns(entries);

            // Act
            var result = _service.GetSharedManga(profileId1, profileId2);

            // Assert
            result.Should().HaveCount(1); // Only One Piece is shared
            _mockEntryRepository.Verify(r => r.GetEntriesByProfileIds(profileId1, profileId2), Times.Once);
        }

        private Entry CreateTestEntry(int id, string mangaName, int profileId, int quantity = 5)
        {
            return new Entry
            {
                Id = id,
                Manga = new Manga { Id = id, Name = mangaName, Volumes = 10 },
                MangaId = id,
                ProfileId = profileId,
                Quantity = quantity,
                Pending = null,
                Priority = false
            };
        }
    }
}