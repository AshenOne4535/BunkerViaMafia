using Bunker.Api.Data;
using Microsoft.EntityFrameworkCore;
using Bunker.Api.Middleware;
using Bunker.Api.Services;
using System.Text.Json.Serialization;
using Bunker.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IRoomService, RoomService>();

// 1. Реєстрація контексту БД PostgreSQL
builder.Services.AddDbContext<BunkerDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Важно для будущего подключения SignalR
    });
});


// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddSignalR();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddSingleton<IRoomService, RoomService>();
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowReact");
app.UseAuthorization();
app.MapControllers();

app.Run();