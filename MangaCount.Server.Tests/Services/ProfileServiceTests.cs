using FluentAssertions;
using MangaCount.Server.DTO;
using MangaCount.Server.Model;
using MangaCount.Server.Repositories.Contracts;
using MangaCount.Server.Services;
using Moq;
using System.Net;
using Xunit;
using DomainProfile = MangaCount.Server.Domain.Profile;

namespace MangaCount.Server.Tests.Services
{
    public class ProfileServiceTests
    {
        private readonly Mock<IProfileRepository> _mockRepository;
        private readonly ProfileService _service;

        public ProfileServiceTests()
        {
            _mockRepository = new Mock<IProfileRepository>();
            _service = new ProfileService(_mockRepository.Object);
        }

        [Fact]
        public void GetAllProfiles_ShouldReturnMappedProfiles()
        {
            // Arrange
            var profiles = new List<DomainProfile>
            {
                new DomainProfile { Id = 1, Name = "Test Profile 1", IsActive = true, CreatedDate = DateTime.UtcNow },
                new DomainProfile { Id = 2, Name = "Test Profile 2", IsActive = true, CreatedDate = DateTime.UtcNow }
            };
            _mockRepository.Setup(r => r.GetAllProfiles()).Returns(profiles);

            // Act
            var result = _service.GetAllProfiles();

            // Assert
            result.Should().HaveCount(2);
            result[0].Name.Should().Be("Test Profile 1");
            result[1].Name.Should().Be("Test Profile 2");
            _mockRepository.Verify(r => r.GetAllProfiles(), Times.Once);
        }

        [Fact]
        public void GetProfileById_WithValidId_ShouldReturnMappedProfile()
        {
            // Arrange
            var profile = new DomainProfile 
            { 
                Id = 1, 
                Name = "Test Profile", 
                IsActive = true, 
                CreatedDate = DateTime.UtcNow 
            };
            _mockRepository.Setup(r => r.GetById(1)).Returns(profile);

            // Act
            var result = _service.GetProfileById(1);

            // Assert
            result.Should().NotBeNull();
            result.Id.Should().Be(1);
            result.Name.Should().Be("Test Profile");
            _mockRepository.Verify(r => r.GetById(1), Times.Once);
        }

        [Fact]
        public void GetProfileById_WithInvalidId_ShouldReturnNull()
        {
            // Arrange
            _mockRepository.Setup(r => r.GetById(999)).Returns((DomainProfile?)null);

            // Act
            var result = _service.GetProfileById(999);

            // Assert
            result.Should().BeNull();
            _mockRepository.Verify(r => r.GetById(999), Times.Once);
        }

        [Fact]
        public void SaveOrUpdate_WithNewProfile_ShouldCallCreate()
        {
            // Arrange
            var profileDTO = new ProfileDTO 
            { 
                Id = 0, 
                Name = "New Profile", 
                IsActive = true, 
                CreatedDate = DateTime.UtcNow 
            };
            var createdProfile = new DomainProfile 
            { 
                Id = 1, 
                Name = "New Profile", 
                IsActive = true, 
                CreatedDate = DateTime.UtcNow 
            };
            _mockRepository.Setup(r => r.Create(It.IsAny<DomainProfile>())).Returns(createdProfile);

            // Act
            var result = _service.SaveOrUpdate(profileDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.OK);
            _mockRepository.Verify(r => r.Create(It.IsAny<DomainProfile>()), Times.Once);
            _mockRepository.Verify(r => r.Update(It.IsAny<DomainProfile>()), Times.Never);
        }

        [Fact]
        public void SaveOrUpdate_WithExistingProfile_ShouldCallUpdate()
        {
            // Arrange
            var profileDTO = new ProfileDTO 
            { 
                Id = 1, 
                Name = "Updated Profile", 
                IsActive = true, 
                CreatedDate = DateTime.UtcNow 
            };
            var updatedProfile = new DomainProfile 
            { 
                Id = 1, 
                Name = "Updated Profile", 
                IsActive = true, 
                CreatedDate = DateTime.UtcNow 
            };
            _mockRepository.Setup(r => r.Update(It.IsAny<DomainProfile>())).Returns(updatedProfile);

            // Act
            var result = _service.SaveOrUpdate(profileDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.OK);
            _mockRepository.Verify(r => r.Update(It.IsAny<DomainProfile>()), Times.Once);
            _mockRepository.Verify(r => r.Create(It.IsAny<DomainProfile>()), Times.Never);
        }

        [Fact]
        public void SaveOrUpdate_WhenRepositoryReturnsNull_ShouldReturnBadRequest()
        {
            // Arrange
            var profileDTO = new ProfileDTO 
            { 
                Id = 0, 
                Name = "New Profile", 
                IsActive = true, 
                CreatedDate = DateTime.UtcNow 
            };
            _mockRepository.Setup(r => r.Create(It.IsAny<DomainProfile>())).Returns((DomainProfile?)null);

            // Act
            var result = _service.SaveOrUpdate(profileDTO);

            // Assert
            result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            _mockRepository.Verify(r => r.Create(It.IsAny<DomainProfile>()), Times.Once);
        }

        [Fact]
        public void DeleteProfile_ShouldCallRepositoryDelete()
        {
            // Arrange
            var profileId = 1;

            // Act
            _service.DeleteProfile(profileId);

            // Assert
            _mockRepository.Verify(r => r.Delete(profileId), Times.Once);
        }
    }
}