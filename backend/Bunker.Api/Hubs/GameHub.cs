using Bunker.Api.Data;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Hubs;

public class GameHub : Hub
{
    private readonly BunkerDbContext _db;

    public GameHub(BunkerDbContext db)
    {
        _db = db;
    }

    public async Task JoinRoomGroup(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        await Groups.AddToGroupAsync(Context.ConnectionId, code);
    }

    public async Task RegisterPlayerConnection(string roomCode, Guid playerId)
    {
        var code = roomCode.ToUpper().Trim();
        await Groups.AddToGroupAsync(Context.ConnectionId, code);

        var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
        if (player != null)
        {
            player.ConnectionId = Context.ConnectionId;
            player.IsOnline = true;
            await _db.SaveChangesAsync();
        }
    }

    public async Task LeaveRoomGroup(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, code);
    }
}