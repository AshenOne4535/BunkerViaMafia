using Bunker.Api.Data;
using Bunker.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Hubs;

public class GameHub : Hub
{
    private readonly BunkerDbContext _db;
    private readonly IDiscussionTimerService _timerService;

    public GameHub(BunkerDbContext db, IDiscussionTimerService timerService)
    {
        _db = db;
        _timerService = timerService;
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

    public async Task SyncTimer(string roomCode)
    {
        var state = await _timerService.GetTimerStateAsync(roomCode);
        await Clients.Caller.SendAsync("TimerUpdated", state);
    }

    public async Task LeaveRoomGroup(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, code);
    }
}