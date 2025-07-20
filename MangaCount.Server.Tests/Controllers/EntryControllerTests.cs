using FluentAssertions;
using MangaCount.Server.Controllers;
using MangaCount.Server.Domain;
using MangaCount.Server.DTO;
using MangaCount.Server.Model;
using MangaCount.Server.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Net;
using System.Text;
using Xunit;

namespace MangaCount.Server.Tests.Controllers
{
    public class EntryControllerTests
    {
        private readonly Mock<ILogger<EntryController>> _mockLogger;
        private readonly Mock<IEntryService> _mockService;
        private readonly EntryController _controller;

        public EntryControllerTests()
        {
            _mockLogger = new Mock<ILogger<EntryController>>();
            _mockService = new Mock<IEntryService>();
            _controller = new EntryController(_mockLogger.Object, _mockService.Object);
        }

        [Fact]
        public void GetAllEntries_WithoutProfileId_ShouldReturnAllEntries()
        {
            // Arrange
            var entries = new List<EntryModel>
            {
                CreateTestEntry(1, "One Piece", 1),
                CreateTestEntry(2, "Naruto", 1)
            };
            _mockService.Setup(s => s.GetAllEntries(null)).Returns(entries);

            // Act
            var result = _controller.GetAllEntries();

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedEntries = okResult.Value.Should().BeAssignableTo<List<EntryModel>>().Subject;
            returnedEntries.Should().HaveCount(2);
            _mockService.Verify(s => s.GetAllEntries(null), Times.Once);
        }

        [Fact]
        public void GetAllEntries_WithProfileId_ShouldReturnFilteredEntries()
        {
            // Arrange
            var profileId = 1;
            var entries = new List<EntryModel>
            {
                CreateTestEntry(1, "One Piece", profileId)
            };
            _mockService.Setup(s => s.GetAllEntries(profileId)).Returns(entries);

            // Act
            var result = _controller.GetAllEntries(profileId);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedEntries = okResult.Value.Should().BeAssignableTo<List<EntryModel>>().Subject;
            returnedEntries.Should().HaveCount(1);
            returnedEntries[0].ProfileId.Should().Be(profileId);
            _mockService.Verify(s => s.GetAllEntries(profileId), Times.Once);
        }

        [Fact]
        public void GetAllEntries_WhenExceptionThrown_ShouldReturnInternalServerError()
        {
            // Arrange
            _mockService.Setup(s => s.GetAllEntries(It.IsAny<int?>()))
                .Throws(new Exception("Database error"));

            // Act
            var result = _controller.GetAllEntries();

            // Assert
            var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
            statusResult.StatusCode.Should().Be(500);
        }

        [Fact]
        public void GetEntryById_WithValidId_ShouldReturnEntry()
        {
            // Arrange
            var entryId = 1;
            var entry = CreateTestEntry(entryId, "Dragon Ball", 1);
            _mockService.Setup(s => s.GetEntryById(entryId)).Returns(entry);

            // Act
            var result = _controller.GetEntryById(entryId);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedEntry = okResult.Value.Should().BeAssignableTo<EntryModel>().Subject;
            returnedEntry.Id.Should().Be(entryId);
            returnedEntry.Manga.Name.Should().Be("Dragon Ball");
            _mockService.Verify(s => s.GetEntryById(entryId), Times.Once);
        }

        [Fact]
        public void GetEntryById_WithInvalidId_ShouldReturnNotFound()
        {
            // Arrange
            var entryId = 999;
            _mockService.Setup(s => s.GetEntryById(entryId)).Returns((EntryModel?)null);

            // Act
            var result = _controller.GetEntryById(entryId);

            // Assert
            result.Result.Should().BeOfType<NotFoundObjectResult>();
            _mockService.Verify(s => s.GetEntryById(entryId), Times.Once);
        }

        [Fact]
        public void GetEntryById_WhenExceptionThrown_ShouldReturnInternalServerError()
        {
            // Arrange
            var entryId = 1;
            _mockService.Setup(s => s.GetEntryById(entryId))
                .Throws(new Exception("Database error"));

            // Act
            var result = _controller.GetEntryById(entryId);

            // Assert
            var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
            statusResult.StatusCode.Should().Be(500);
        }

        [Fact]
        public async Task ImportFromFile_WithValidFile_ShouldReturnOk()
        {
            // Arrange
            var profileId = 1;
            var content = "Manga Name\tQuantity\tVolumes\tPending\t\tPriority\nOne Piece\t5\t100\t\t\tfalse";
            var fileName = "test.tsv";
            var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
            var file = new FormFile(stream, 0, stream.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = "text/tab-separated-values"
            };

            _mockService.Setup(s => s.ImportFromFileAsync(file, profileId))
                .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

            // Act
            var result = await _controller.ImportFromFile(profileId, file);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            _mockService.Verify(s => s.ImportFromFileAsync(file, profileId), Times.Once);
        }

        [Fact]
        public async Task ImportFromFile_WithNoFile_ShouldReturnBadRequest()
        {
            // Arrange
            var profileId = 1;

            // Act
            var result = await _controller.ImportFromFile(profileId, null);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
            _mockService.Verify(s => s.ImportFromFileAsync(It.IsAny<IFormFile>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task ImportFromFile_WithInvalidFileType_ShouldReturnBadRequest()
        {
            // Arrange
            var profileId = 1;
            _mockService.Setup(s => s.ImportFromFileAsync(It.IsAny<IFormFile>(), profileId))
                .ThrowsAsync(new InvalidOperationException("File must be a .tsv file"));

            var content = "invalid content";
            var fileName = "test.txt";
            var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
            var file = new FormFile(stream, 0, stream.Length, "file", fileName);

            // Act
            var result = await _controller.ImportFromFile(profileId, file);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task ImportFromFile_WhenServiceThrowsGenericException_ShouldReturnInternalServerError()
        {
            // Arrange
            var profileId = 1;
            _mockService.Setup(s => s.ImportFromFileAsync(It.IsAny<IFormFile>(), profileId))
                .ThrowsAsync(new Exception("Database error"));

            var content = "test content";
            var fileName = "test.tsv";
            var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
            var file = new FormFile(stream, 0, stream.Length, "file", fileName);

            // Act
            var result = await _controller.ImportFromFile(profileId, file);

            // Assert
            var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
            statusResult.StatusCode.Should().Be(500);
        }

        [Fact]
        public void CreateOrUpdateEntry_WithValidEntry_ShouldReturnOk()
        {
            // Arrange
            var entryModel = CreateTestEntry(0, "New Manga", 1);
            var successResponse = new HttpResponseMessage(HttpStatusCode.OK);
            _mockService.Setup(s => s.SaveOrUpdate(It.IsAny<EntryDTO>())).Returns(successResponse);

            // Act
            var result = _controller.CreateOrUpdateEntry(entryModel);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            _mockService.Verify(s => s.SaveOrUpdate(It.IsAny<EntryDTO>()), Times.Once);
        }

        [Fact]
        public void CreateOrUpdateEntry_WhenServiceFails_ShouldReturnBadRequest()
        {
            // Arrange
            var entryModel = CreateTestEntry(0, "New Manga", 1);
            var failureResponse = new HttpResponseMessage(HttpStatusCode.BadRequest);
            _mockService.Setup(s => s.SaveOrUpdate(It.IsAny<EntryDTO>())).Returns(failureResponse);

            // Act
            var result = _controller.CreateOrUpdateEntry(entryModel);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
            _mockService.Verify(s => s.SaveOrUpdate(It.IsAny<EntryDTO>()), Times.Once);
        }

        [Fact]
        public void CreateOrUpdateEntry_WhenExceptionThrown_ShouldReturnInternalServerError()
        {
            // Arrange
            var entryModel = CreateTestEntry(0, "New Manga", 1);
            _mockService.Setup(s => s.SaveOrUpdate(It.IsAny<EntryDTO>()))
                .Throws(new Exception("Database error"));

            // Act
            var result = _controller.CreateOrUpdateEntry(entryModel);

            // Assert
            var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
            statusResult.StatusCode.Should().Be(500);
        }

        [Fact]
        public void GetSharedManga_WithValidProfileIds_ShouldReturnSharedEntries()
        {
            // Arrange
            var profileId1 = 1;
            var profileId2 = 2;
            var sharedManga = new List<dynamic>
            {
                new { MangaId = 1, MangaName = "One Piece", Profile1Quantity = 5, Profile2Quantity = 3 }
            };
            _mockService.Setup(s => s.GetSharedManga(profileId1, profileId2)).Returns(sharedManga);

            // Act
            var result = _controller.GetSharedManga(profileId1, profileId2);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedSharedManga = okResult.Value.Should().BeAssignableTo<List<dynamic>>().Subject;
            returnedSharedManga.Should().HaveCount(1);
            _mockService.Verify(s => s.GetSharedManga(profileId1, profileId2), Times.Once);
        }

        [Fact]
        public void GetSharedManga_WhenExceptionThrown_ShouldReturnInternalServerError()
        {
            // Arrange
            var profileId1 = 1;
            var profileId2 = 2;
            _mockService.Setup(s => s.GetSharedManga(profileId1, profileId2))
                .Throws(new Exception("Database error"));

            // Act
            var result = _controller.GetSharedManga(profileId1, profileId2);

            // Assert
            var statusResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
            statusResult.StatusCode.Should().Be(500);
        }

        [Theory]
        [InlineData(1, 2)]
        [InlineData(5, 10)]
        [InlineData(100, 200)]
        public void GetSharedManga_WithDifferentProfileIds_ShouldCallServiceWithCorrectParameters(
            int profileId1, int profileId2)
        {
            // Arrange
            var sharedManga = new List<dynamic>();
            _mockService.Setup(s => s.GetSharedManga(profileId1, profileId2)).Returns(sharedManga);

            // Act
            _controller.GetSharedManga(profileId1, profileId2);

            // Assert
            _mockService.Verify(s => s.GetSharedManga(profileId1, profileId2), Times.Once);
        }

        private EntryModel CreateTestEntry(int id, string mangaName, int profileId)
        {
            return new EntryModel
            {
                Id = id,
                Manga = new Manga { Id = id, Name = mangaName, Volumes = 10 },
                MangaId = id,
                ProfileId = profileId,
                Quantity = 5,
                Pending = null,
                Priority = false
            };
        }
    }
}