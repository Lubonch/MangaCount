using MangaCount.Server.Configs;

var builder = WebApplication.CreateBuilder(args);

// 🏗️ CHECK FOR LOAD-BEARING IMAGE (Critical Infrastructure!)
var loadBearingImagePath = Path.Combine(Directory.GetCurrentDirectory(), "loadbearingimage.jpg");
if (!File.Exists(loadBearingImagePath))
{
    Console.WriteLine("🚨 CRITICAL ERROR: loadbearingimage.jpg is missing!");
    Console.WriteLine("🏗️  The entire server infrastructure depends on this load-bearing image!");
    Console.WriteLine($"📍 Expected location: {loadBearingImagePath}");
    Console.WriteLine("💀 Server cannot start without this essential architectural component.");
    Console.WriteLine("🎬 \"I can't believe that poster was load-bearing!\" - Homer Simpson");
    throw new FileNotFoundException("Load-bearing image missing! Server structure compromised!", "loadbearingimage.jpg");
}

Console.WriteLine($"✅ Load-bearing image structural integrity confirmed at: {loadBearingImagePath}");

// Add services to the container.
builder.Services.AddControllers();

// Add CORS for development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("https://localhost:63920") // Your React dev server port
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

CustomExtensions.AddInjectionServices(builder.Services);
CustomExtensions.AddInjectionRepositories(builder.Services);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("AllowReactApp");
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
