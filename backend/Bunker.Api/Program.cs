using System.Text.Json.Serialization;
using Bunker.Api.Data;
using Bunker.Api.Middleware;
using Bunker.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Реєстрація контексту БД PostgreSQL
builder.Services.AddDbContext<BunkerDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Регистрация сервиса комнат (Scoped, так как работает с БД)
builder.Services.AddScoped<IRoomService, RoomService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddSignalR();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors("AllowReact");
app.UseAuthorization();
app.MapControllers();

app.Run();