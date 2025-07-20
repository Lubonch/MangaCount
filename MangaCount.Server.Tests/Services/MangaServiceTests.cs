using FluentAssertions;
using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services;
using Moq;
using System.Net;
using Xunit;

namespace MangaCount.Server.Tests.Services
{
    public class MangaServiceTests
    {
        private readonly Mock<IMangaRepository> _mockRepository;
        private readonly MangaService _service;

        public MangaServiceTests()
        {
            _mockRepository = new Mock<IMangaRepository>();
            _service = new MangaService(_mockRepository.Object);
        }

        [Fact]
        public void GetAllMangas_ShouldReturnMappedMangas()
        {
            // Arrange
            var mangas = new List<Manga>
            {
                new Manga { Id = 1, Name = "One Piece", Volumes = 100 },
                new Manga { Id = 2, Name = "Naruto", Volumes = 72 }
            };
            _mockRepository.Setup(r => r.GetAllMangas()).Returns(mangas);

            // Act
            var result = _service.GetAllMangas();

            // Assert
            result.Should().HaveCount(2);
            result[0].Name.Should().Be("One Piece");
            result[0].Volumes.Should().Be(100);
            result[1].Name.Should().Be("Naruto");
            result[1].Volumes.Should().Be(72);
            _mockRepository.Verify(r => r.GetAllMangas(), Times.Once);
        }

        [Fact]
        public void GetMangaById_WithValidId_ShouldReturnMappedManga()
        {
            // Arrange
            var manga = new Manga { Id = 1, Name = "Dragon Ball", Volumes = 42 };
            _mockRepository.Setup(r => r.GetById(1)).Returns(manga);

            // Act
            var result = _service.GetMangaById(1);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().Be(1);
            result.Name.Should().Be("Dragon Ball");
            result.Volumes.Should().Be(42);
            _mockRepository.Verify(r => r.GetById(1), Times.Once);
        }

        [Fact]
        public void GetMangaById_WithInvalidId_ShouldReturnNull()
        {
            // Arrange
            _mockRepository.Setup(r => r.GetById(999)).Returns((Manga?)null);

            // Act
            var result = _service.GetMangaById(999);

            // Assert
            result.Should().BeNull();
            _mockRepository.Verify(r => r.GetById(999), Times.Once);
        }

        [Fact]
        public void SaveOrUpdate_WithNewManga_ShouldCallCreate()
        {
            // Arrange
            var mangaDTO = new MangaDTO { Id = 0, Name = "New Manga", Volumes = 10 };
            var createdManga = new Manga { Id = 1, Name = "New Manga", Volumes = 10 };
            _mockRepository.Setup(r => r.Create(It.IsAny<Manga>())).Returns(createdManga);

            // Act
            var result = _service.SaveOrUpdate(mangaDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.OK);
            _mockRepository.Verify(r => r.Create(It.IsAny<Manga>()), Times.Once);
            _mockRepository.Verify(r => r.Update(It.IsAny<Manga>()), Times.Never);
        }

        [Fact]
        public void SaveOrUpdate_WithExistingManga_ShouldCallUpdate()
        {
            // Arrange
            var mangaDTO = new MangaDTO { Id = 1, Name = "Updated Manga", Volumes = 20 };
            var updatedManga = new Manga { Id = 1, Name = "Updated Manga", Volumes = 20 };
            _mockRepository.Setup(r => r.Update(It.IsAny<Manga>())).Returns(updatedManga);

            // Act
            var result = _service.SaveOrUpdate(mangaDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.OK);
            _mockRepository.Verify(r => r.Update(It.IsAny<Manga>()), Times.Once);
            _mockRepository.Verify(r => r.Create(It.IsAny<Manga>()), Times.Never);
        }

        [Fact]
        public void SaveOrUpdate_WhenRepositoryReturnsNull_ShouldReturnForbidden()
        {
            // Arrange
            var mangaDTO = new MangaDTO { Id = 0, Name = "New Manga", Volumes = 10 };
            _mockRepository.Setup(r => r.Create(It.IsAny<Manga>())).Returns((Manga?)null);

            // Act
            var result = _service.SaveOrUpdate(mangaDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.Forbidden);
            _mockRepository.Verify(r => r.Create(It.IsAny<Manga>()), Times.Once);
        }

        [Theory]
        [InlineData(0, "Test Manga", null)]
        [InlineData(0, "Test Manga", 15)]
        public void SaveOrUpdate_WithValidData_ShouldMapCorrectly(int id, string name, int? volumes)
        {
            // Arrange
            var mangaDTO = new MangaDTO { Id = id, Name = name, Volumes = volumes };
            var expectedManga = new Manga { Id = 1, Name = name, Volumes = volumes };
            _mockRepository.Setup(r => r.Create(It.Is<Manga>(m => 
                m.Name == name && m.Volumes == volumes))).Returns(expectedManga);

            // Act
            var result = _service.SaveOrUpdate(mangaDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.OK);
            _mockRepository.Verify(r => r.Create(It.Is<Manga>(m => 
                m.Name == name && m.Volumes == volumes)), Times.Once);
        }
    }
}