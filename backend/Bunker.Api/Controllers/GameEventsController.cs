using Bunker.Api.Models;
using Bunker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bunker.Api.Controllers;

[ApiController]
[Route("api/rooms/{roomCode}/events")]
public class GameEventsController : ControllerBase
{
    private readonly IGameEventService _eventService;

    public GameEventsController(IGameEventService eventService)
    {
        _eventService = eventService;
    }

    // Task 19: Pobranie historii wydarzeń pokoju (Feed Wydarzeń)
    [HttpGet]
    public async Task<IActionResult> GetEvents(
        string roomCode,
        [FromQuery] int limit = 50,
        [FromQuery] bool newestFirst = true)
    {
        var events = await _eventService.GetRoomEventsAsync(roomCode, limit, newestFirst);
        return Ok(events);
    }

    public record CreateGameEventRequest(
        GameEventType EventType = GameEventType.System,
        string Message = "",
        Guid? ActorPlayerId = null,
        string? ActorNickname = null
    );

    // Task 19: Dodanie wydarzenia do Feedu (oraz rozgłoszenie przez SignalR)
    [HttpPost]
    public async Task<IActionResult> CreateEvent(string roomCode, [FromBody] CreateGameEventRequest request)
    {
        var created = await _eventService.AddEventAsync(
            roomCode,
            request.EventType,
            request.Message,
            request.ActorPlayerId,
            request.ActorNickname
        );

        return Ok(created);
    }
}
