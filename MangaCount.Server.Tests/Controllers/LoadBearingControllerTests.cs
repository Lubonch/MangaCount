using FluentAssertions;
using MangaCount.Server.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace MangaCount.Server.Tests.Controllers
{
    public class LoadBearingControllerTests
    {
        private readonly Mock<ILogger<LoadBearingController>> _mockLogger;
        private readonly LoadBearingController _controller;

        public LoadBearingControllerTests()
        {
            _mockLogger = new Mock<ILogger<LoadBearingController>>();
            _controller = new LoadBearingController(_mockLogger.Object);
        }

        [Fact]
        public void GetLoadBearingStatus_WhenImageExists_ShouldReturnOk()
        {
            // Arrange
            var tempImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
            
            // Create a temporary test image file
            File.WriteAllText(tempImagePath, "fake image content");

            try
            {
                // Act
                var result = _controller.GetLoadBearingStatus();

                // Assert
                result.Should().BeOfType<OkObjectResult>();
                var okResult = result as OkObjectResult;
                var response = okResult.Value;
                
                response.Should().NotBeNull();
                var properties = response.GetType().GetProperties();
                properties.Should().Contain(p => p.Name == "status");
                properties.Should().Contain(p => p.Name == "structuralIntegrity");
            }
            finally
            {
                // Clean up
                if (File.Exists(tempImagePath))
                    File.Delete(tempImagePath);
            }
        }

        [Fact]
        public void GetLoadBearingStatus_WhenImageMissing_ShouldReturnInternalServerError()
        {
            // Arrange
            var tempImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
            
            // Ensure the file doesn't exist
            if (File.Exists(tempImagePath))
                File.Delete(tempImagePath);

            // Act
            var result = _controller.GetLoadBearingStatus();

            // Assert
            var statusResult = result.Should().BeOfType<ObjectResult>().Subject;
            statusResult.StatusCode.Should().Be(500);
            
            // Verify that critical log was called
            _mockLogger.Verify(
                l => l.Log(
                    LogLevel.Critical,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("STRUCTURAL INTEGRITY COMPROMISED")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [Fact]
        public void GetLoadBearingImage_WhenImageExists_ShouldReturnFile()
        {
            // Arrange
            var tempImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
            var testContent = "fake image content";
            
            // Create a temporary test image file
            File.WriteAllText(tempImagePath, testContent);

            try
            {
                // Act
                var result = _controller.GetLoadBearingImage();

                // Assert
                result.Should().BeOfType<FileContentResult>();
                var fileResult = result as FileContentResult;
                fileResult.ContentType.Should().Be("image/jpeg");
                fileResult.FileDownloadName.Should().Be("loadbearingimage.jpg");
            }
            finally
            {
                // Clean up
                if (File.Exists(tempImagePath))
                    File.Delete(tempImagePath);
            }
        }

        [Fact]
        public void GetLoadBearingImage_WhenImageMissing_ShouldReturnNotFound()
        {
            // Arrange
            var tempImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
            
            // Ensure the file doesn't exist
            if (File.Exists(tempImagePath))
                File.Delete(tempImagePath);

            // Act
            var result = _controller.GetLoadBearingImage();

            // Assert
            result.Should().BeOfType<NotFoundObjectResult>();
        }
    }
}