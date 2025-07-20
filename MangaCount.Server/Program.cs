using MangaCount.Server.Configs;

var builder = WebApplication.CreateBuilder(args);

var loadBearingImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
if (!File.Exists(loadBearingImagePath))
{
    throw new FileNotFoundException("Ah, I wouldn't take it down if I were you. It's a load-bearing image.", "loadbearingimage.jpg");
}

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

app.MapFallbackToFile("/index.html");

app.Run();