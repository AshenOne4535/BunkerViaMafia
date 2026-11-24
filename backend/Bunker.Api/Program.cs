using System.Text.Json.Serialization;
using Bunker.Api.Data;
using Bunker.Api.Hubs;
using Bunker.Api.Middleware;
using Bunker.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Контекст БД PostgreSQL
builder.Services.AddDbContext<BunkerDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Сервисы
builder.Services.AddSingleton<RoomTimerTracker>();
builder.Services.AddScoped<IGameEventService, GameEventService>();
builder.Services.AddScoped<IDiscussionTimerService, DiscussionTimerService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<CardAssignmentService>();
builder.Services.AddHostedService<DiscussionTimerHostedService>();

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
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

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
app.MapHub<GameHub>("/hubs/game");

app.Run();