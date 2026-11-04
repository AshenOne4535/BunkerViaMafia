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
    public async Task<IActionResult> CreateRoom([FromQuery] string frontendUrl = "http://localhost:5173")
    {
        var result = await _roomService.CreateRoomAsync(frontendUrl);
        return Ok(new
        {
            room = result.Room,
            qrCodeBase64 = result.QrCodeBase64,
            joinUrl = result.JoinUrl
        });
    }

    [HttpGet("{code}")]
    public async Task<IActionResult> GetRoom(string code)
    {
        var room = await _roomService.GetRoomAsync(code);
        if (room == null) return NotFound(new { message = "Pokój nie został znaleziony." });
        return Ok(room);
    }

    public record JoinRoomRequest(string RoomCode, string Nickname);

    [HttpPost("join")]
    public async Task<IActionResult> JoinRoom([FromBody] JoinRoomRequest request)
    {
        var player = await _roomService.JoinRoomAsync(request.RoomCode, request.Nickname);
        return Ok(player);
    }
}