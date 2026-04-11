using FluentAssertions;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Services;
using MangaCount.Server.Services.Contracts;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace MangaCount.Server.Tests.Services
{
    public class RecommendationServiceTests
    {
        private readonly Mock<ILogger<RecommendationService>> _mockLogger;
        private readonly Mock<IEntryService> _mockEntryService;
        private readonly Mock<ILocalRecommendationEngine> _mockLocalRecommendationEngine;
        private readonly Mock<IRecommendationRankingProvider> _mockGitHubProvider;
        private readonly Mock<IRecommendationRankingProvider> _mockOpenRouterProvider;

        public RecommendationServiceTests()
        {
            _mockLogger = new Mock<ILogger<RecommendationService>>();
            _mockEntryService = new Mock<IEntryService>();
            _mockLocalRecommendationEngine = new Mock<ILocalRecommendationEngine>();
            _mockGitHubProvider = new Mock<IRecommendationRankingProvider>();
            _mockOpenRouterProvider = new Mock<IRecommendationRankingProvider>();
        }

        [Fact]
        public async Task GetRecommendationsAsync_UsesTheFirstSuccessfulProvider()
        {
            var entries = CreateEntries();
            var localResponse = CreateLocalResponse();

            _mockEntryService.Setup(service => service.GetAllEntries(1)).Returns(entries);
            _mockLocalRecommendationEngine
                .Setup(engine => engine.GenerateRecommendationsAsync(entries, 10, It.IsAny<CancellationToken>()))
                .ReturnsAsync(localResponse);

            _mockGitHubProvider.SetupGet(provider => provider.Name).Returns("github-models");
            _mockGitHubProvider.SetupGet(provider => provider.IsConfigured).Returns(true);
            _mockGitHubProvider
                .Setup(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<RecommendationCandidate>
                {
                    localResponse.Items[1],
                    localResponse.Items[0]
                });

            _mockOpenRouterProvider.SetupGet(provider => provider.Name).Returns("openrouter");
            _mockOpenRouterProvider.SetupGet(provider => provider.IsConfigured).Returns(true);

            var service = CreateService(_mockGitHubProvider.Object, _mockOpenRouterProvider.Object);

            var response = await service.GetRecommendationsAsync(1);

            response.Provider.Should().Be("github-models");
            response.Items.Select(item => item.Id).Should().ContainInOrder("pluto", "monster");
            _mockOpenRouterProvider.Verify(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task GetRecommendationsAsync_FallsBackToTheNextProviderWhenTheFirstFails()
        {
            var entries = CreateEntries();
            var localResponse = CreateLocalResponse();

            _mockEntryService.Setup(service => service.GetAllEntries(1)).Returns(entries);
            _mockLocalRecommendationEngine
                .Setup(engine => engine.GenerateRecommendationsAsync(entries, 10, It.IsAny<CancellationToken>()))
                .ReturnsAsync(localResponse);

            _mockGitHubProvider.SetupGet(provider => provider.Name).Returns("github-models");
            _mockGitHubProvider.SetupGet(provider => provider.IsConfigured).Returns(true);
            _mockGitHubProvider
                .Setup(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new TimeoutException("provider timeout"));

            _mockOpenRouterProvider.SetupGet(provider => provider.Name).Returns("openrouter");
            _mockOpenRouterProvider.SetupGet(provider => provider.IsConfigured).Returns(true);
            _mockOpenRouterProvider
                .Setup(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<RecommendationCandidate>
                {
                    localResponse.Items[0],
                    localResponse.Items[1]
                });

            var service = CreateService(_mockGitHubProvider.Object, _mockOpenRouterProvider.Object);

            var response = await service.GetRecommendationsAsync(1);

            response.Provider.Should().Be("openrouter");
            response.Items.Select(item => item.Id).Should().ContainInOrder("monster", "pluto");
            _mockOpenRouterProvider.Verify(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task GetRecommendationsAsync_ReturnsTheLocalResponseWhenNoProviderIsConfigured()
        {
            var entries = CreateEntries();
            var localResponse = CreateLocalResponse();

            _mockEntryService.Setup(service => service.GetAllEntries(1)).Returns(entries);
            _mockLocalRecommendationEngine
                .Setup(engine => engine.GenerateRecommendationsAsync(entries, 10, It.IsAny<CancellationToken>()))
                .ReturnsAsync(localResponse);

            _mockGitHubProvider.SetupGet(provider => provider.Name).Returns("github-models");
            _mockGitHubProvider.SetupGet(provider => provider.IsConfigured).Returns(false);
            _mockOpenRouterProvider.SetupGet(provider => provider.Name).Returns("openrouter");
            _mockOpenRouterProvider.SetupGet(provider => provider.IsConfigured).Returns(false);

            var service = CreateService(_mockGitHubProvider.Object, _mockOpenRouterProvider.Object);

            var response = await service.GetRecommendationsAsync(1);

            response.Provider.Should().Be("local");
            response.Items.Select(item => item.Id).Should().ContainInOrder("monster", "pluto");
        }

        [Fact]
        public async Task GetRecommendationsAsync_ReturnsTheLocalResponseWhenAllProvidersFail()
        {
            var entries = CreateEntries();
            var localResponse = CreateLocalResponse();

            _mockEntryService.Setup(service => service.GetAllEntries(1)).Returns(entries);
            _mockLocalRecommendationEngine
                .Setup(engine => engine.GenerateRecommendationsAsync(entries, 10, It.IsAny<CancellationToken>()))
                .ReturnsAsync(localResponse);

            _mockGitHubProvider.SetupGet(provider => provider.Name).Returns("github-models");
            _mockGitHubProvider.SetupGet(provider => provider.IsConfigured).Returns(true);
            _mockGitHubProvider
                .Setup(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("unavailable"));

            _mockOpenRouterProvider.SetupGet(provider => provider.Name).Returns("openrouter");
            _mockOpenRouterProvider.SetupGet(provider => provider.IsConfigured).Returns(true);
            _mockOpenRouterProvider
                .Setup(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new HttpRequestException("upstream failed"));

            var service = CreateService(_mockGitHubProvider.Object, _mockOpenRouterProvider.Object);

            var response = await service.GetRecommendationsAsync(1);

            response.Provider.Should().Be("local");
            response.Items.Select(item => item.Id).Should().ContainInOrder("monster", "pluto");
        }

        [Fact]
        public async Task GetRecommendationsAsync_OnlyPassesLocallyFilteredCandidatesToProviders()
        {
            RecommendationContext? capturedContext = null;
            var entries = CreateEntries();
            var localResponse = CreateLocalResponse();

            _mockEntryService.Setup(service => service.GetAllEntries(1)).Returns(entries);
            _mockLocalRecommendationEngine
                .Setup(engine => engine.GenerateRecommendationsAsync(entries, 10, It.IsAny<CancellationToken>()))
                .ReturnsAsync(localResponse);

            _mockGitHubProvider.SetupGet(provider => provider.Name).Returns("github-models");
            _mockGitHubProvider.SetupGet(provider => provider.IsConfigured).Returns(true);
            _mockGitHubProvider
                .Setup(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()))
                .Callback<RecommendationContext, CancellationToken>((context, _) => capturedContext = context)
                .ReturnsAsync(localResponse.Items);

            var service = CreateService(_mockGitHubProvider.Object);

            var response = await service.GetRecommendationsAsync(1);

            response.Provider.Should().Be("github-models");
            capturedContext.Should().NotBeNull();
            capturedContext!.InferredCountry.Should().Be("Argentina");
            capturedContext.Candidates.Should().OnlyContain(candidate => candidate.PublisherCountry == "Argentina");
            capturedContext.BaseResponse.BlockedByImportCount.Should().Be(1);
        }

        [Fact]
        public async Task GetRecommendationsAsync_PropagatesCancellationInsteadOfFallingBack()
        {
            var entries = CreateEntries();
            var localResponse = CreateLocalResponse();
            using var cancellationTokenSource = new CancellationTokenSource();

            _mockEntryService.Setup(service => service.GetAllEntries(1)).Returns(entries);
            _mockLocalRecommendationEngine
                .Setup(engine => engine.GenerateRecommendationsAsync(entries, 10, It.IsAny<CancellationToken>()))
                .ReturnsAsync(localResponse);

            _mockGitHubProvider.SetupGet(provider => provider.Name).Returns("github-models");
            _mockGitHubProvider.SetupGet(provider => provider.IsConfigured).Returns(true);
            _mockGitHubProvider
                .Setup(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new OperationCanceledException(cancellationTokenSource.Token));

            _mockOpenRouterProvider.SetupGet(provider => provider.Name).Returns("openrouter");
            _mockOpenRouterProvider.SetupGet(provider => provider.IsConfigured).Returns(true);

            var service = CreateService(_mockGitHubProvider.Object, _mockOpenRouterProvider.Object);
            cancellationTokenSource.Cancel();

            Func<Task> act = async () => await service.GetRecommendationsAsync(1, 10, cancellationTokenSource.Token);

            await act.Should().ThrowAsync<OperationCanceledException>();
            _mockOpenRouterProvider.Verify(provider => provider.RerankAsync(It.IsAny<RecommendationContext>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        private RecommendationService CreateService(params IRecommendationRankingProvider[] providers)
        {
            return new RecommendationService(
                _mockLogger.Object,
                _mockEntryService.Object,
                _mockLocalRecommendationEngine.Object,
                providers);
        }

        private static List<EntryModel> CreateEntries()
        {
            return new List<EntryModel>
            {
                new EntryModel
                {
                    Id = 1,
                    MangaId = 1,
                    ProfileId = 1,
                    Quantity = 9,
                    Manga = new Manga
                    {
                        Id = 1,
                        Name = "Monster",
                        Publisher = new Publisher { Id = 1, Name = "Ivrea" },
                        Format = new Format { Id = 1, Name = "Kanzenban" },
                        PublisherId = 1,
                        FormatId = 1,
                        Volumes = 9,
                    }
                }
            };
        }

        private static RecommendationResponse CreateLocalResponse()
        {
            return new RecommendationResponse
            {
                Provider = "local",
                InferredCountry = "Argentina",
                IsConfident = true,
                AvailableCount = 2,
                BlockedByImportCount = 1,
                Items = new List<RecommendationCandidate>
                {
                    new RecommendationCandidate
                    {
                        Id = "monster",
                        Title = "Monster",
                        Publisher = "Ivrea",
                        PublisherCountry = "Argentina",
                        Format = "Kanzenban",
                        Score = 0.91,
                        Reason = "Matches your collection through Mystery, Thriller"
                    },
                    new RecommendationCandidate
                    {
                        Id = "pluto",
                        Title = "Pluto",
                        Publisher = "Ivrea",
                        PublisherCountry = "Argentina",
                        Format = "Kanzenban",
                        Score = 0.88,
                        Reason = "Matches your collection through Mystery, Robots"
                    }
                },
                Inference = new RecommendationInference
                {
                    Country = "Argentina",
                    IsConfident = true,
                    Breakdown = new List<RecommendationCountryBreakdown>
                    {
                        new RecommendationCountryBreakdown
                        {
                            Country = "Argentina",
                            VolumeCount = 9,
                            SeriesCount = 1,
                        }
                    }
                }
            };
        }
    }
}