using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MangaCount.Server.Repositories.Contracts;
using Moq;

namespace MangaCount.Server.Tests.Integration
{
    public class IntegrationTestBase : IDisposable
    {
        protected readonly HttpClient _client;
        private readonly WebApplicationFactory<object> _factory;

        public IntegrationTestBase()
        {
            _factory = new WebApplicationFactory<object>()
                .WithWebHostBuilder(builder =>
                {
                    builder.UseStartup<TestStartup>();
                    builder.UseEnvironment("Testing");
                });

            _client = _factory.CreateClient();
        }

        public void Dispose()
        {
            _client?.Dispose();
            _factory?.Dispose();
            GC.SuppressFinalize(this);
        }
    }

    public class TestStartup
    {
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers();
            
            // Add mock dependencies
            services.AddScoped(_ => new Mock<IProfileRepository>().Object);
            services.AddScoped(_ => new Mock<IMangaRepository>().Object);
            services.AddScoped(_ => new Mock<IEntryRepository>().Object);
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseRouting();
            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}