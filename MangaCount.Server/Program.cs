using MangaCount.Server.Configs;

var builder = WebApplication.CreateBuilder(args);

// Verificar imagen load-bearing
var loadBearingImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
if (!File.Exists(loadBearingImagePath))
{
    throw new FileNotFoundException("Ah, I wouldn't take it down if I were you. It's a load-bearing image.", "loadbearingimage.jpg");
}

// Add services to the container.
builder.Services.AddControllers();

// CORS para Angular
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policy =>
        {
            policy.WithOrigins("https://localhost:4200", "http://localhost:4200")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Add Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add AutoMapper
builder.Services.AddAutoMapper(cfg => cfg.AddProfile<MappingProfile>());

// Add NHibernate
var connectionString = builder.Configuration.GetConnectionString("MangacountDatabase") 
    ?? throw new InvalidOperationException("Connection string 'MangacountDatabase' not found.");
builder.Services.AddNHibernate(connectionString);

// Add services and repositories
builder.Services.AddInjectionServices();
builder.Services.AddInjectionRepositories();

var app = builder.Build();

// Configure static files
app.UseStaticFiles();

app.UseCors("AllowAngularApp");

// Crear directorio para imágenes de perfil
var profilesPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "profiles");
if (!Directory.Exists(profilesPath))
{
    Directory.CreateDirectory(profilesPath);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();

app.MapFallbackToFile("/index.html");

app.Run();
