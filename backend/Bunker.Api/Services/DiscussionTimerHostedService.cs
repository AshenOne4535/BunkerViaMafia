using Bunker.Api.Data;
using Bunker.Api.Hubs;
using Bunker.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Services;

public class DiscussionTimerHostedService : BackgroundService
{
    private readonly RoomTimerTracker _tracker;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<GameHub> _hubContext;
    private readonly ILogger<DiscussionTimerHostedService> _logger;

    public DiscussionTimerHostedService(
        RoomTimerTracker tracker,
        IServiceScopeFactory scopeFactory,
        IHubContext<GameHub> hubContext,
        ILogger<DiscussionTimerHostedService> logger)
    {
        _tracker = tracker;
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await TryHydrateTimersFromDatabaseAsync(stoppingToken);

        using var periodicTimer = new PeriodicTimer(TimeSpan.FromSeconds(1));

        while (await periodicTimer.WaitForNextTickAsync(stoppingToken))
        {
            var snapshot = _tracker.GetSnapshot();
            if (snapshot.Count == 0)
                continue;

            var now = DateTime.UtcNow;

            foreach (var entry in snapshot)
            {
                if (stoppingToken.IsCancellationRequested)
                    break;

                try
                {
                    var state = DiscussionTimerService.BuildStateDtoFromTracker(entry, now);

                    if (state.RemainingSeconds == 30 && entry.TotalSeconds >= 60 && entry.TryMarkWarningSent())
                    {
                        await LogTimerWarningAsync(entry);
                    }

                    if (state.RemainingSeconds <= 0)
                    {
                        if (_tracker.TryComplete(entry.RoomCode, entry))
                        {
                            await HandleTimerExpiredAsync(entry, state, now, stoppingToken);
                        }
                    }
                    else
                    {
                        await _hubContext.Clients.Group(entry.RoomCode).SendAsync("TimerUpdated", state, stoppingToken);
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Błąd aktualizacji zegara dla pokoju {RoomCode}", entry.RoomCode);
                }
            }
        }
    }

    private async Task TryHydrateTimersFromDatabaseAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BunkerDbContext>();
            var now = DateTime.UtcNow;

            var activeRooms = await db.Rooms
                .AsNoTracking()
                .Where(r =>
                    !r.IsTimerPaused &&
                    r.PhaseEndsAtUtc != null &&
                    r.PhaseEndsAtUtc > now &&
                    r.CurrentPhase != GamePhase.Lobby &&
                    r.CurrentPhase != GamePhase.Ended)
                .ToListAsync(ct);

            foreach (var room in activeRooms)
            {
                var defaultTotal = DiscussionTimerService.GetDefaultPhaseDurationSeconds(room);
                var remaining = Math.Max(1, (int)Math.Ceiling((room.PhaseEndsAtUtc!.Value - now).TotalSeconds));

                _tracker.SetRunning(new TrackedRoomTimer
                {
                    RoomCode = room.Code,
                    CurrentPhase = room.CurrentPhase,
                    CurrentDay = room.CurrentDay,
                    MaxDays = room.MaxDays,
                    TotalSeconds = Math.Max(defaultTotal, remaining),
                    PhaseStartedAtUtc = room.PhaseStartedAtUtc ?? now,
                    PhaseEndsAtUtc = room.PhaseEndsAtUtc.Value
                });
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Pominięto początkową synchronizację zegarów z bazy danych.");
        }
    }

    private async Task LogTimerWarningAsync(TrackedRoomTimer entry)
    {
        using var scope = _scopeFactory.CreateScope();
        var eventService = scope.ServiceProvider.GetRequiredService<IGameEventService>();

        var warningText = entry.CurrentPhase == GamePhase.FinalVoting
            ? "Uwaga! Pozostało 30 sekund do końca głosowania finałowego!"
            : $"Uwaga! Pozostało 30 sekund dyskusji w Dniu {entry.CurrentDay}!";

        await eventService.AddEventAsync(entry.RoomCode, GameEventType.TimerWarning, warningText);
    }

    private async Task HandleTimerExpiredAsync(
        TrackedRoomTimer entry,
        RoomTimerStateDto expiredState,
        DateTime now,
        CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BunkerDbContext>();
        var eventService = scope.ServiceProvider.GetRequiredService<IGameEventService>();

        var room = await db.Rooms.FirstOrDefaultAsync(r => r.Code == entry.RoomCode, ct);
        if (room != null)
        {
            room.PhaseEndsAtUtc = now;
            room.IsTimerPaused = false;
            room.PausedRemainingSeconds = 0;
            await db.SaveChangesAsync(ct);

            var endMessage = entry.CurrentPhase == GamePhase.FinalVoting
                ? "Czas głosowania finałowego dobiegł końca!"
                : $"Czas dyskusji w Dniu {entry.CurrentDay} dobiegł końca!";

            await eventService.AddEventForRoomAsync(room, GameEventType.TimerEnded, endMessage);
        }

        await _hubContext.Clients.Group(entry.RoomCode).SendAsync("TimerUpdated", expiredState, ct);
        await _hubContext.Clients.Group(entry.RoomCode).SendAsync("DiscussionTimerEnded", new
        {
            roomCode = entry.RoomCode,
            day = entry.CurrentDay,
            maxDays = entry.MaxDays,
            phase = entry.CurrentPhase,
            endedAtUtc = now
        }, ct);
    }
}
