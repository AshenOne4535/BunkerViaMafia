using Bunker.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bunker.Api.Controllers;

[ApiController]
[Route("api/rooms/{roomCode}/timer")]
public class DiscussionTimerController : ControllerBase
{
    private readonly IDiscussionTimerService _timerService;

    public DiscussionTimerController(IDiscussionTimerService timerService)
    {
        _timerService = timerService;
    }

    // Task 20: Pobranie aktualnego stanu zegara dyskusji i paska postępu dni
    [HttpGet]
    public async Task<IActionResult> GetTimerState(string roomCode)
    {
        var state = await _timerService.GetTimerStateAsync(roomCode);
        return Ok(state);
    }

    // Task 20: Dedykowany endpoint dla paska postępu dni
    [HttpGet("/api/rooms/{roomCode}/days-progress")]
    public async Task<IActionResult> GetDaysProgress(string roomCode)
    {
        var progress = await _timerService.GetDaysProgressAsync(roomCode);
        return Ok(progress);
    }

    public record StartTimerRequest(int? DurationSeconds = null);

    // Task 20: Uruchomienie serwerowego zegara dyskusji dla bieżącego dnia
    [HttpPost("start")]
    public async Task<IActionResult> StartTimer(
        string roomCode,
        [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)]
        StartTimerRequest? request = null)
    {
        var state = await _timerService.StartDiscussionTimerAsync(roomCode, request?.DurationSeconds);
        return Ok(state);
    }

    [HttpPost("pause")]
    public async Task<IActionResult> PauseTimer(string roomCode)
    {
        var state = await _timerService.PauseTimerAsync(roomCode);
        return Ok(state);
    }

    [HttpPost("resume")]
    public async Task<IActionResult> ResumeTimer(string roomCode)
    {
        var state = await _timerService.ResumeTimerAsync(roomCode);
        return Ok(state);
    }

    [HttpPost("reset")]
    public async Task<IActionResult> ResetTimer(string roomCode)
    {
        var state = await _timerService.ResetTimerAsync(roomCode);
        return Ok(state);
    }

    // Task 20: Przejście do kolejnego dnia i aktualizacja paska postępu dni
    [HttpPost("next-day")]
    public async Task<IActionResult> NextDay(string roomCode)
    {
        var state = await _timerService.AdvanceToNextDayAsync(roomCode);
        return Ok(state);
    }
}
