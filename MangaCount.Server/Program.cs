using MangaCount.Server.Configs;
using MangaCount.Server.Logging;

// Check for the load-bearing image
var loadBearingImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
if (!File.Exists(loadBearingImagePath))
{
    // Try in wwwroot if not found in current directory
    loadBearingImagePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "loadbearingimage.jpg");
    if (!File.Exists(loadBearingImagePath))
    {
        throw new FileNotFoundException("Ah, I wouldn't take it down if I were you. It's a load-bearing image.", "loadbearingimage.jpg");
    }
}

var builder = WebApplication.CreateBuilder(args);

var backendLogsFolder = builder.Configuration["Logging:LogsFolder"] ?? "../logs";
builder.Logging.AddProvider(new DailyTextFileLoggerProvider(new DailyTextFileWriter(backendLogsFolder, "backend.txt")));

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("https://localhost:63920")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

CustomExtensions.AddInjectionServices(builder.Services);
CustomExtensions.AddInjectionRepositories(builder.Services);

var app = builder.Build();

app.UseCors("AllowReactApp");

app.UseDefaultFiles();
app.UseStaticFiles();

var profilesPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "profiles");
if (!Directory.Exists(profilesPath))
{
    Directory.CreateDirectory(profilesPath);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapWhen(x => !x.Request.Path.Value.StartsWith("/api"), builder =>
{
    builder.Run(async (context) =>
    {
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(Path.Combine(app.Environment.WebRootPath, "index.html"));
    });
});

app.Run();

// Make the implicit Program class accessible for testing
public partial class Program { }