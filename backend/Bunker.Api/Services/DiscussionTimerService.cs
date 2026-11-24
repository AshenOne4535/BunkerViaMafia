using System.Collections.Concurrent;
using Bunker.Api.Data;
using Bunker.Api.Hubs;
using Bunker.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Services;

public record DayStepDto(
    int DayNumber,
    string Status // "completed" | "current" | "upcoming"
);

public record DaysProgressDto(
    string RoomCode,
    GamePhase CurrentPhase,
    int CurrentDay,
    int MaxDays,
    int DayProgressPercent,
    int BunkerCapacity,
    int PlayersCount,
    IReadOnlyList<DayStepDto> Days
);

public record RoomTimerStateDto(
    string RoomCode,
    GamePhase CurrentPhase,
    int CurrentDay,
    int MaxDays,
    int DayProgressPercent,
    IReadOnlyList<DayStepDto> Days,
    int RemainingSeconds,
    int TotalSeconds,
    string FormattedTime,
    int TimerProgressPercent,
    bool IsRunning,
    bool IsPaused,
    DateTime? PhaseStartedAtUtc,
    DateTime? PhaseEndsAtUtc,
    DateTime ServerTimeUtc
);

public sealed class TrackedRoomTimer
{
    private int _warningSent;

    public required string RoomCode { get; init; }
    public required GamePhase CurrentPhase { get; init; }
    public required int CurrentDay { get; init; }
    public required int MaxDays { get; init; }
    public required int TotalSeconds { get; init; }
    public required DateTime PhaseStartedAtUtc { get; init; }
    public required DateTime PhaseEndsAtUtc { get; init; }

    public bool TryMarkWarningSent() => Interlocked.CompareExchange(ref _warningSent, 1, 0) == 0;
}

public sealed class RoomTimerTracker
{
    private readonly ConcurrentDictionary<string, TrackedRoomTimer> _activeTimers = new(StringComparer.OrdinalIgnoreCase);

    public void SetRunning(TrackedRoomTimer timer)
    {
        _activeTimers[timer.RoomCode.ToUpperInvariant()] = timer;
    }

    public void Remove(string roomCode)
    {
        _activeTimers.TryRemove(roomCode.ToUpperInvariant(), out _);
    }

    public bool TryComplete(string roomCode, TrackedRoomTimer expected)
    {
        var key = roomCode.ToUpperInvariant();
        return _activeTimers.TryRemove(new KeyValuePair<string, TrackedRoomTimer>(key, expected));
    }

    public TrackedRoomTimer? TryGet(string roomCode)
    {
        _activeTimers.TryGetValue(roomCode.ToUpperInvariant(), out var timer);
        return timer;
    }

    public IReadOnlyCollection<TrackedRoomTimer> GetSnapshot() => _activeTimers.Values.ToArray();
}

public interface IDiscussionTimerService
{
    Task<RoomTimerStateDto> GetTimerStateAsync(string roomCode);
    Task<DaysProgressDto> GetDaysProgressAsync(string roomCode);
    Task<RoomTimerStateDto> StartDiscussionTimerAsync(string roomCode, int? customDurationSeconds = null);
    Task<RoomTimerStateDto> PauseTimerAsync(string roomCode);
    Task<RoomTimerStateDto> ResumeTimerAsync(string roomCode);
    Task<RoomTimerStateDto> ResetTimerAsync(string roomCode);
    Task<RoomTimerStateDto> AdvanceToNextDayAsync(string roomCode);
}

public class DiscussionTimerService : IDiscussionTimerService
{
    private readonly BunkerDbContext _db;
    private readonly RoomTimerTracker _tracker;
    private readonly IGameEventService _eventService;
    private readonly IHubContext<GameHub> _hubContext;

    public DiscussionTimerService(
        BunkerDbContext db,
        RoomTimerTracker tracker,
        IGameEventService eventService,
        IHubContext<GameHub> hubContext)
    {
        _db = db;
        _tracker = tracker;
        _eventService = eventService;
        _hubContext = hubContext;
    }

    public async Task<RoomTimerStateDto> GetTimerStateAsync(string roomCode)
    {
        var room = await GetRequiredRoomAsync(roomCode);
        var tracked = _tracker.TryGet(room.Code);
        var totalOverride = tracked?.TotalSeconds;
        return BuildStateDto(room, DateTime.UtcNow, totalOverride);
    }

    public async Task<DaysProgressDto> GetDaysProgressAsync(string roomCode)
    {
        if (string.IsNullOrWhiteSpace(roomCode))
            throw new Exception("Kod pokoju jest wymagany.");

        var code = roomCode.ToUpper().Trim();
        var room = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Code == code);

        if (room == null)
            throw new Exception("Pokój o podanym kodzie nie istnieje.");

        var maxDays = Math.Max(1, room.MaxDays);
        var currentDay = Math.Clamp(room.CurrentDay, 1, maxDays);
        var (days, dayProgressPercent) = BuildDaysProgress(room.CurrentPhase, currentDay, maxDays);

        return new DaysProgressDto(
            room.Code,
            room.CurrentPhase,
            currentDay,
            maxDays,
            dayProgressPercent,
            room.BunkerCapacity,
            room.Players.Count,
            days
        );
    }

    public async Task<RoomTimerStateDto> StartDiscussionTimerAsync(string roomCode, int? customDurationSeconds = null)
    {
        var room = await GetRequiredRoomAsync(roomCode);
        var now = DateTime.UtcNow;

        // Idempotentność przy podwójnym wywołaniu tuż po starcie gry (np. assign-roles + /timer/start)
        if (customDurationSeconds == null &&
            room.CurrentPhase == GamePhase.DayDiscussion &&
            !room.IsTimerPaused &&
            room.PhaseStartedAtUtc.HasValue &&
            room.PhaseEndsAtUtc.HasValue &&
            (now - room.PhaseStartedAtUtc.Value).TotalSeconds < 3 &&
            room.PhaseEndsAtUtc.Value > now)
        {
            var existingTracked = _tracker.TryGet(room.Code);
            return BuildStateDto(room, now, existingTracked?.TotalSeconds);
        }

        if (room.CurrentPhase == GamePhase.Lobby || room.CurrentPhase == GamePhase.NightActions)
        {
            room.CurrentPhase = GamePhase.DayDiscussion;
        }

        room.CurrentDay = Math.Clamp(room.CurrentDay, 1, Math.Max(1, room.MaxDays));

        var totalSeconds = customDurationSeconds is > 0
            ? Math.Clamp(customDurationSeconds.Value, 5, 3600)
            : GetDefaultPhaseDurationSeconds(room);

        room.PhaseStartedAtUtc = now;
        room.PhaseEndsAtUtc = now.AddSeconds(totalSeconds);
        room.IsTimerPaused = false;
        room.PausedRemainingSeconds = null;

        await _db.SaveChangesAsync();

        _tracker.SetRunning(new TrackedRoomTimer
        {
            RoomCode = room.Code,
            CurrentPhase = room.CurrentPhase,
            CurrentDay = room.CurrentDay,
            MaxDays = room.MaxDays,
            TotalSeconds = totalSeconds,
            PhaseStartedAtUtc = now,
            PhaseEndsAtUtc = room.PhaseEndsAtUtc.Value
        });

        await _eventService.AddEventForRoomAsync(
            room,
            GameEventType.DayStarted,
            $"Rozpoczął się Dzień {room.CurrentDay} z {room.MaxDays} — faza dyskusji ({FormatDurationLabel(totalSeconds)})."
        );

        var state = BuildStateDto(room, now, totalSeconds);
        await BroadcastDayAndTimerAsync(room.Code, state);
        return state;
    }

    public async Task<RoomTimerStateDto> PauseTimerAsync(string roomCode)
    {
        var room = await GetRequiredRoomAsync(roomCode);

        if (room.CurrentPhase == GamePhase.Lobby)
            throw new Exception("Nie można wstrzymać zegara przed rozpoczęciem gry.");

        var now = DateTime.UtcNow;
        if (room.IsTimerPaused)
            return BuildStateDto(room, now);

        if (room.PhaseEndsAtUtc == null)
            throw new Exception("Zegar w tym pokoju nie jest aktualnie uruchomiony.");

        var remaining = Math.Max(0, (int)Math.Ceiling((room.PhaseEndsAtUtc.Value - now).TotalSeconds));
        room.IsTimerPaused = true;
        room.PausedRemainingSeconds = remaining;
        room.PhaseEndsAtUtc = null;

        _tracker.Remove(room.Code);
        await _db.SaveChangesAsync();

        await _eventService.AddEventForRoomAsync(
            room,
            GameEventType.System,
            $"Zegar dyskusji został wstrzymany ({FormatMmSs(remaining)})."
        );

        var state = BuildStateDto(room, now);
        await _hubContext.Clients.Group(room.Code).SendAsync("TimerUpdated", state);
        return state;
    }

    public async Task<RoomTimerStateDto> ResumeTimerAsync(string roomCode)
    {
        var room = await GetRequiredRoomAsync(roomCode);
        var now = DateTime.UtcNow;

        if (!room.IsTimerPaused)
            return BuildStateDto(room, now);

        var defaultTotal = GetDefaultPhaseDurationSeconds(room);
        var remaining = Math.Max(1, room.PausedRemainingSeconds ?? defaultTotal);
        var totalSeconds = Math.Max(defaultTotal, remaining);

        room.PhaseStartedAtUtc ??= now;
        room.PhaseEndsAtUtc = now.AddSeconds(remaining);
        room.IsTimerPaused = false;
        room.PausedRemainingSeconds = null;

        await _db.SaveChangesAsync();

        _tracker.SetRunning(new TrackedRoomTimer
        {
            RoomCode = room.Code,
            CurrentPhase = room.CurrentPhase,
            CurrentDay = room.CurrentDay,
            MaxDays = room.MaxDays,
            TotalSeconds = totalSeconds,
            PhaseStartedAtUtc = room.PhaseStartedAtUtc.Value,
            PhaseEndsAtUtc = room.PhaseEndsAtUtc.Value
        });

        await _eventService.AddEventForRoomAsync(
            room,
            GameEventType.System,
            $"Zegar dyskusji został wznowiony ({FormatMmSs(remaining)})."
        );

        var state = BuildStateDto(room, now, totalSeconds);
        await _hubContext.Clients.Group(room.Code).SendAsync("TimerUpdated", state);
        return state;
    }

    public async Task<RoomTimerStateDto> ResetTimerAsync(string roomCode)
    {
        var room = await GetRequiredRoomAsync(roomCode);

        if (room.CurrentPhase == GamePhase.Lobby)
            room.CurrentPhase = GamePhase.DayDiscussion;

        var totalSeconds = GetDefaultPhaseDurationSeconds(room);
        var now = DateTime.UtcNow;

        room.PhaseStartedAtUtc = now;
        room.PhaseEndsAtUtc = now.AddSeconds(totalSeconds);
        room.IsTimerPaused = false;
        room.PausedRemainingSeconds = null;

        await _db.SaveChangesAsync();

        _tracker.SetRunning(new TrackedRoomTimer
        {
            RoomCode = room.Code,
            CurrentPhase = room.CurrentPhase,
            CurrentDay = room.CurrentDay,
            MaxDays = room.MaxDays,
            TotalSeconds = totalSeconds,
            PhaseStartedAtUtc = now,
            PhaseEndsAtUtc = room.PhaseEndsAtUtc.Value
        });

        await _eventService.AddEventForRoomAsync(
            room,
            GameEventType.System,
            $"Zegar w Dniu {room.CurrentDay} został zresetowany ({FormatMmSs(totalSeconds)})."
        );

        var state = BuildStateDto(room, now, totalSeconds);
        await _hubContext.Clients.Group(room.Code).SendAsync("TimerUpdated", state);
        return state;
    }

    public async Task<RoomTimerStateDto> AdvanceToNextDayAsync(string roomCode)
    {
        var room = await GetRequiredRoomAsync(roomCode);

        if (room.CurrentPhase == GamePhase.Lobby)
        {
            return await StartDiscussionTimerAsync(room.Code);
        }

        var now = DateTime.UtcNow;

        if (room.CurrentDay < room.MaxDays)
        {
            room.CurrentDay += 1;
            room.CurrentPhase = GamePhase.DayDiscussion;
            var totalSeconds = room.DayDurationMinutes * 60;

            room.PhaseStartedAtUtc = now;
            room.PhaseEndsAtUtc = now.AddSeconds(totalSeconds);
            room.IsTimerPaused = false;
            room.PausedRemainingSeconds = null;

            await _db.SaveChangesAsync();

            _tracker.SetRunning(new TrackedRoomTimer
            {
                RoomCode = room.Code,
                CurrentPhase = room.CurrentPhase,
                CurrentDay = room.CurrentDay,
                MaxDays = room.MaxDays,
                TotalSeconds = totalSeconds,
                PhaseStartedAtUtc = now,
                PhaseEndsAtUtc = room.PhaseEndsAtUtc.Value
            });

            await _eventService.AddEventForRoomAsync(
                room,
                GameEventType.DayStarted,
                $"Rozpoczął się Dzień {room.CurrentDay} z {room.MaxDays} — faza dyskusji ({room.DayDurationMinutes} min)."
            );

            var state = BuildStateDto(room, now, totalSeconds);
            await BroadcastDayAndTimerAsync(room.Code, state);
            return state;
        }
        else
        {
            room.CurrentPhase = GamePhase.FinalVoting;
            var totalSeconds = room.VotingDurationSeconds;

            room.PhaseStartedAtUtc = now;
            room.PhaseEndsAtUtc = now.AddSeconds(totalSeconds);
            room.IsTimerPaused = false;
            room.PausedRemainingSeconds = null;

            await _db.SaveChangesAsync();

            _tracker.SetRunning(new TrackedRoomTimer
            {
                RoomCode = room.Code,
                CurrentPhase = room.CurrentPhase,
                CurrentDay = room.CurrentDay,
                MaxDays = room.MaxDays,
                TotalSeconds = totalSeconds,
                PhaseStartedAtUtc = now,
                PhaseEndsAtUtc = room.PhaseEndsAtUtc.Value
            });

            await _eventService.AddEventForRoomAsync(
                room,
                GameEventType.PhaseChanged,
                $"Wszystkie dni dyskusji ({room.MaxDays}/{room.MaxDays}) zakończone! Rozpoczyna się głosowanie finałowe ({totalSeconds} s)."
            );

            var state = BuildStateDto(room, now, totalSeconds);
            await BroadcastDayAndTimerAsync(room.Code, state);
            return state;
        }
    }

    private async Task BroadcastDayAndTimerAsync(string roomCode, RoomTimerStateDto state)
    {
        await _hubContext.Clients.Group(roomCode).SendAsync("DayProgressUpdated", new
        {
            roomCode = state.RoomCode,
            currentPhase = state.CurrentPhase,
            currentDay = state.CurrentDay,
            maxDays = state.MaxDays,
            dayProgressPercent = state.DayProgressPercent,
            days = state.Days
        });

        await _hubContext.Clients.Group(roomCode).SendAsync("TimerUpdated", state);
    }

    private async Task<Room> GetRequiredRoomAsync(string roomCode)
    {
        if (string.IsNullOrWhiteSpace(roomCode))
            throw new Exception("Kod pokoju jest wymagany.");

        var code = roomCode.ToUpper().Trim();
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Code == code);
        if (room == null)
            throw new Exception("Pokój o podanym kodzie nie istnieje.");

        return room;
    }

    public static int GetDefaultPhaseDurationSeconds(Room room) => room.CurrentPhase switch
    {
        GamePhase.NightActions => Math.Max(5, room.NightDurationSeconds),
        GamePhase.FinalVoting => Math.Max(5, room.VotingDurationSeconds),
        GamePhase.Ended => 0,
        _ => Math.Max(60, room.DayDurationMinutes * 60)
    };

    public static RoomTimerStateDto BuildStateDto(Room room, DateTime nowUtc, int? totalSecondsOverride = null)
    {
        var maxDays = Math.Max(1, room.MaxDays);
        var currentDay = Math.Clamp(room.CurrentDay, 1, maxDays);
        var defaultTotal = GetDefaultPhaseDurationSeconds(room);

        int remainingSeconds;
        bool isRunning;

        if (room.CurrentPhase == GamePhase.Lobby)
        {
            remainingSeconds = defaultTotal;
            isRunning = false;
        }
        else if (room.CurrentPhase == GamePhase.Ended)
        {
            remainingSeconds = 0;
            isRunning = false;
        }
        else if (room.IsTimerPaused)
        {
            remainingSeconds = Math.Max(0, room.PausedRemainingSeconds ?? 0);
            isRunning = false;
        }
        else if (room.PhaseEndsAtUtc.HasValue)
        {
            remainingSeconds = Math.Max(0, (int)Math.Ceiling((room.PhaseEndsAtUtc.Value - nowUtc).TotalSeconds));
            isRunning = remainingSeconds > 0;
        }
        else
        {
            remainingSeconds = defaultTotal;
            isRunning = false;
        }

        var totalSeconds = Math.Max(totalSecondsOverride ?? defaultTotal, remainingSeconds);
        var timerProgressPercent = totalSeconds > 0
            ? Math.Clamp((int)Math.Round((double)remainingSeconds / totalSeconds * 100), 0, 100)
            : 0;

        var (days, dayProgressPercent) = BuildDaysProgress(room.CurrentPhase, currentDay, maxDays);

        return new RoomTimerStateDto(
            room.Code,
            room.CurrentPhase,
            currentDay,
            maxDays,
            dayProgressPercent,
            days,
            remainingSeconds,
            totalSeconds,
            FormatMmSs(remainingSeconds),
            timerProgressPercent,
            isRunning,
            room.IsTimerPaused,
            room.PhaseStartedAtUtc,
            room.PhaseEndsAtUtc,
            nowUtc
        );
    }

    public static RoomTimerStateDto BuildStateDtoFromTracker(TrackedRoomTimer tracked, DateTime nowUtc)
    {
        var maxDays = Math.Max(1, tracked.MaxDays);
        var currentDay = Math.Clamp(tracked.CurrentDay, 1, maxDays);
        var remainingSeconds = Math.Max(0, (int)Math.Ceiling((tracked.PhaseEndsAtUtc - nowUtc).TotalSeconds));
        var totalSeconds = Math.Max(tracked.TotalSeconds, remainingSeconds);
        var timerProgressPercent = totalSeconds > 0
            ? Math.Clamp((int)Math.Round((double)remainingSeconds / totalSeconds * 100), 0, 100)
            : 0;

        var (days, dayProgressPercent) = BuildDaysProgress(tracked.CurrentPhase, currentDay, maxDays);

        return new RoomTimerStateDto(
            tracked.RoomCode,
            tracked.CurrentPhase,
            currentDay,
            maxDays,
            dayProgressPercent,
            days,
            remainingSeconds,
            totalSeconds,
            FormatMmSs(remainingSeconds),
            timerProgressPercent,
            remainingSeconds > 0,
            false,
            tracked.PhaseStartedAtUtc,
            tracked.PhaseEndsAtUtc,
            nowUtc
        );
    }

    public static (IReadOnlyList<DayStepDto> Days, int DayProgressPercent) BuildDaysProgress(
        GamePhase phase,
        int currentDay,
        int maxDays)
    {
        var days = new List<DayStepDto>(maxDays);

        for (int d = 1; d <= maxDays; d++)
        {
            string status;
            if (phase == GamePhase.Lobby)
            {
                status = "upcoming";
            }
            else if (phase == GamePhase.FinalVoting || phase == GamePhase.Ended)
            {
                status = "completed";
            }
            else if (d < currentDay)
            {
                status = "completed";
            }
            else if (d == currentDay)
            {
                status = "current";
            }
            else
            {
                status = "upcoming";
            }

            days.Add(new DayStepDto(d, status));
        }

        int dayProgressPercent = phase switch
        {
            GamePhase.Lobby => 0,
            GamePhase.FinalVoting or GamePhase.Ended => 100,
            _ => Math.Clamp((int)Math.Round((double)currentDay / maxDays * 100), 0, 100)
        };

        return (days, dayProgressPercent);
    }

    public static string FormatMmSs(int totalSeconds)
    {
        var clamped = Math.Max(0, totalSeconds);
        var minutes = clamped / 60;
        var seconds = clamped % 60;
        return $"{minutes:D2}:{seconds:D2}";
    }

    private static string FormatDurationLabel(int seconds)
    {
        if (seconds % 60 == 0)
            return $"{seconds / 60} min";
        return FormatMmSs(seconds);
    }
}
