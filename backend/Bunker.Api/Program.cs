using Bunker.Api.Data;
using Microsoft.EntityFrameworkCore;
using Bunker.Api.Middleware;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddControllers();

// Add services to the container.
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

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