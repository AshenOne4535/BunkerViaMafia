using Bunker.Api.Data;
using Bunker.Api.Hubs;
using Bunker.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Services;

public record GameEventDto(
    Guid Id,
    string RoomCode,
    GameEventType EventType,
    string Message,
    int Day,
    GamePhase Phase,
    Guid? ActorPlayerId,
    string? ActorNickname,
    DateTime CreatedAt
);

public interface IGameEventService
{
    Task<GameEventDto> AddEventAsync(
        string roomCode,
        GameEventType eventType,
        string message,
        Guid? actorPlayerId = null,
        string? actorNickname = null,
        bool broadcast = true
    );

    Task<GameEventDto> AddEventForRoomAsync(
        Room room,
        GameEventType eventType,
        string message,
        Guid? actorPlayerId = null,
        string? actorNickname = null,
        bool broadcast = true
    );

    Task<IReadOnlyList<GameEventDto>> GetRoomEventsAsync(
        string roomCode,
        int limit = 50,
        bool newestFirst = true
    );

    Task<GameEventDto> LogCardRevealedAsync(
        string roomCode,
        Guid playerId,
        string nickname,
        TraitCategory category,
        string cardValue
    );
}

public class GameEventService : IGameEventService
{
    private readonly BunkerDbContext _db;
    private readonly IHubContext<GameHub> _hubContext;

    public GameEventService(BunkerDbContext db, IHubContext<GameHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    public async Task<GameEventDto> AddEventAsync(
        string roomCode,
        GameEventType eventType,
        string message,
        Guid? actorPlayerId = null,
        string? actorNickname = null,
        bool broadcast = true)
    {
        if (string.IsNullOrWhiteSpace(roomCode))
            throw new Exception("Kod pokoju jest wymagany.");

        var code = roomCode.ToUpper().Trim();
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Code == code);
        if (room == null)
            throw new Exception("Pokój o podanym kodzie nie istnieje.");

        return await AddEventForRoomAsync(room, eventType, message, actorPlayerId, actorNickname, broadcast);
    }

    public async Task<GameEventDto> AddEventForRoomAsync(
        Room room,
        GameEventType eventType,
        string message,
        Guid? actorPlayerId = null,
        string? actorNickname = null,
        bool broadcast = true)
    {
        if (string.IsNullOrWhiteSpace(message))
            throw new Exception("Treść wydarzenia nie może być pusta.");

        var gameEvent = new GameEvent
        {
            RoomId = room.Id,
            EventType = eventType,
            Message = message.Trim(),
            Day = room.CurrentDay,
            Phase = room.CurrentPhase,
            ActorPlayerId = actorPlayerId,
            ActorNickname = string.IsNullOrWhiteSpace(actorNickname) ? null : actorNickname.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.GameEvents.Add(gameEvent);
        await _db.SaveChangesAsync();

        var dto = MapToDto(gameEvent, room.Code);

        if (broadcast)
        {
            await _hubContext.Clients.Group(room.Code).SendAsync("GameEventCreated", dto);
        }

        return dto;
    }

    public async Task<IReadOnlyList<GameEventDto>> GetRoomEventsAsync(
        string roomCode,
        int limit = 50,
        bool newestFirst = true)
    {
        if (string.IsNullOrWhiteSpace(roomCode))
            throw new Exception("Kod pokoju jest wymagany.");

        var code = roomCode.ToUpper().Trim();
        var clampedLimit = Math.Clamp(limit, 1, 200);

        var room = await _db.Rooms
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Code == code);

        if (room == null)
            throw new Exception("Pokój o podanym kodzie nie istnieje.");

        var latestEvents = await _db.GameEvents
            .AsNoTracking()
            .Where(e => e.RoomId == room.Id)
            .OrderByDescending(e => e.CreatedAt)
            .Take(clampedLimit)
            .ToListAsync();

        var ordered = newestFirst
            ? latestEvents
            : latestEvents.OrderBy(e => e.CreatedAt).ToList();

        return ordered.Select(e => MapToDto(e, room.Code)).ToList();
    }

    // Pomocnicza metoda gotowa do podpięcia pod Task 16 (odsłanianie kart cech)
    public Task<GameEventDto> LogCardRevealedAsync(
        string roomCode,
        Guid playerId,
        string nickname,
        TraitCategory category,
        string cardValue)
    {
        var categoryPl = GetCategoryNamePl(category);
        var message = $"Gracz {nickname} odsłonił cechę [{categoryPl}]: {cardValue}.";
        return AddEventAsync(roomCode, GameEventType.CardRevealed, message, playerId, nickname);
    }

    public static string GetCategoryNamePl(TraitCategory category) => category switch
    {
        TraitCategory.Profession => "Zawód",
        TraitCategory.Health => "Zdrowie",
        TraitCategory.Phobia => "Fobia",
        TraitCategory.Hobby => "Hobby",
        TraitCategory.Equipment => "Ekwipunek",
        TraitCategory.AgeAndGender => "Wiek i Płeć",
        _ => category.ToString()
    };

    private static GameEventDto MapToDto(GameEvent entity, string roomCode) => new(
        entity.Id,
        roomCode,
        entity.EventType,
        entity.Message,
        entity.Day,
        entity.Phase,
        entity.ActorPlayerId,
        entity.ActorNickname,
        entity.CreatedAt
    );
}
