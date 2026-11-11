using Bunker.Api.Hubs;
using Bunker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Bunker.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly IRoomService _roomService;
    private readonly IHubContext<GameHub> _hubContext;

    public RoomsController(IRoomService roomService, IHubContext<GameHub> hubContext)
    {
        _roomService = roomService;
        _hubContext = hubContext;
    }

    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { message = "Backend is working!" });

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
        var code = request.RoomCode.ToUpper().Trim();

        // Мгновенное уведомление по WebSockets
        await _hubContext.Clients.Group(code).SendAsync("PlayerJoined", player);

        return Ok(player);
    }

    // Task 13: Losowanie tajnych ról dla graczy w pokoju
    [HttpPost("{code}/assign-roles")]
    public async Task<IActionResult> AssignRoles(string code)
    {
        var normalizedCode = code.ToUpper().Trim();
        var assignments = await _roomService.AssignSecretRolesAsync(normalizedCode);

        // Личное сообщение каждому игроку в его телефон (если известен его ConnectionId)
        foreach (var item in assignments)
        {
            if (!string.IsNullOrEmpty(item.ConnectionId))
            {
                await _hubContext.Clients.Client(item.ConnectionId).SendAsync("SecretRoleAssigned", new
                {
                    playerId = item.PlayerId,
                    role = item.Role,
                    roleNamePl = item.RoleNamePl,
                    roleDescriptionPl = item.RoleDescriptionPl
                });
            }
        }

        // Общее уведомление для комнаты (без раскрытия чужих ролей!)
        await _hubContext.Clients.Group(normalizedCode).SendAsync("RolesAssigned", new
        {
            roomCode = normalizedCode,
            playersCount = assignments.Count
        });

        // Возвращаем на экран ТВ только факт успешной раздачи, без спойлеров ролей
        return Ok(new
        {
            message = "Role zostały pomyślnie przydzielone.",
            roomCode = normalizedCode,
            playersCount = assignments.Count
        });
    }

    // Pobranie tajnej roli konkretnego gracza (np. dla ekranu telefonu gracza)
    [HttpGet("{code}/players/{playerId:guid}/role")]
    public async Task<IActionResult> GetPlayerRole(string code, Guid playerId)
    {
        var roleInfo = await _roomService.GetPlayerRoleAsync(code, playerId);
        return Ok(roleInfo);
    }
}