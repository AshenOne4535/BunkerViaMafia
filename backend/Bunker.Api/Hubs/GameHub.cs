using Microsoft.AspNetCore.SignalR;

namespace Bunker.Api.Hubs;

public class GameHub : Hub
{
    public async Task JoinRoomGroup(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        await Groups.AddToGroupAsync(Context.ConnectionId, code);
    }

    public async Task LeaveRoomGroup(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, code);
    }
}