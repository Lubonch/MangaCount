using FluentAssertions;
using MangaCount.Server.Domain;
using MangaCount.Server.Model;
using MangaCount.Server.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace MangaCount.Server.Tests.Services
{
    public class LocalRecommendationEngineTests
    {
        [Fact]
        public async Task GenerateRecommendationsAsync_ExcludesOwnedEditionTitlesAfterNormalization()
        {
            var engine = CreateEngine();
            var entries = new List<EntryModel>
            {
                CreateEntry("Monster (Perfect Edition)", "Ivrea", 9, "Kanzenban")
            };

            var response = await engine.GenerateRecommendationsAsync(entries, 10);

            response.InferredCountry.Should().Be("Argentina");
            response.Items.Select(item => item.Title).Should().NotContain("Monster");
        }

        [Fact]
        public async Task GenerateRecommendationsAsync_IgnoresZeroQuantityEntriesForOwnershipAndInference()
        {
            var engine = CreateEngine();
            var entries = new List<EntryModel>
            {
                CreateEntry("Monster", "Ivrea", 0, "Kanzenban"),
                CreateEntry("Homunculus", "Ovni Press", 15, "Tankoubon")
            };

            var response = await engine.GenerateRecommendationsAsync(entries, 10);

            response.InferredCountry.Should().Be("Argentina");
            response.Items.Select(item => item.Title).Should().Contain("Monster");
        }

        private static LocalRecommendationEngine CreateEngine()
        {
            return new LocalRecommendationEngine(NullLogger<LocalRecommendationEngine>.Instance);
        }

        private static EntryModel CreateEntry(string title, string publisher, int quantity, string format)
        {
            return new EntryModel
            {
                Id = 1,
                MangaId = 1,
                ProfileId = 1,
                Quantity = quantity,
                Manga = new Manga
                {
                    Id = 1,
                    Name = title,
                    Volumes = 1,
                    PublisherId = 1,
                    Publisher = new Publisher { Id = 1, Name = publisher },
                    FormatId = 1,
                    Format = new Format { Id = 1, Name = format }
                }
            };
        }
    }
}