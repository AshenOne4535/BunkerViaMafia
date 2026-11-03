using Bunker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bunker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly IRoomService _roomService;

    public RoomsController(IRoomService roomService)
    {
        _roomService = roomService;
    }

    
    [HttpGet("ping")]
    public IActionResult Ping()
    {
        return Ok(new { message = "Backend is working!" });
    }

    [HttpPost("create")]
    public IActionResult CreateRoom([FromQuery] string frontendUrl = "http://localhost:5173")
    {
        var room = _roomService.CreateRoom(frontendUrl, out var qrCode, out var joinUrl);
        return Ok(new
        {
            roomCode = room.RoomCode,
            joinUrl,
            qrCodeBase64 = qrCode,
            settings = room.Settings,
            players = room.Players
        });
    }

    
    [HttpGet("{code}")]
    public IActionResult GetRoom(string code)
    {
        var room = _roomService.GetRoom(code);
        if (room == null)
            return NotFound(new { message = "Nie znaleziono pokoju o podanym kodzie." });

        return Ok(room);
    }

    public record JoinRoomRequest(string RoomCode, string Nickname);

    
    [HttpPost("join")]
    public IActionResult JoinRoom([FromBody] JoinRoomRequest request)
    {
        var player = _roomService.JoinRoom(request.RoomCode, request.Nickname);
        return Ok(new
        {
            roomCode = request.RoomCode.ToUpper().Trim(),
            player
        });
    }
}