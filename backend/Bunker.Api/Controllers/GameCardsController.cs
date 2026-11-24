using Bunker.Api.Data;
using Bunker.Api.Hubs;
using Bunker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Controllers;

[ApiController]
[Route("api/rooms/{roomCode}/cards")]
public class GameCardsController : ControllerBase
{
    private readonly CardAssignmentService _cardAssignmentService;
    private readonly BunkerDbContext _context;
    private readonly IGameEventService _eventService;
    private readonly IHubContext<GameHub> _hubContext;

    public GameCardsController(
        CardAssignmentService cardAssignmentService,
        BunkerDbContext context,
        IGameEventService eventService,
        IHubContext<GameHub> hubContext)
    {
        _cardAssignmentService = cardAssignmentService;
        _context = context;
        _eventService = eventService;
        _hubContext = hubContext;
    }

    // POST: api/rooms/{roomCode}/cards/assign
    [HttpPost("assign")]
    public async Task<IActionResult> AssignCards(string roomCode)
    {
        try
        {
            await _cardAssignmentService.AssignCardsToRoomAsync(roomCode);
            return Ok(new { message = "Po 6 kart cech zostało pomyślnie przydzielonych wszystkim graczom." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message, error = ex.Message });
        }
    }

    // Task 16: Odsłanianie karty cechy ze smartfona + SignalR + Feed Wydarzeń (Task 19)
    // POST: api/rooms/{roomCode}/cards/reveal
    [HttpPost("reveal")]
    public async Task<IActionResult> RevealCard(string roomCode, [FromBody] RevealCardRequest request)
    {
        try
        {
            var code = roomCode.ToUpper().Trim();
            var revealedCard = await _cardAssignmentService.RevealCardAsync(
                code,
                request.PlayerId,
                request.TraitCardId);

            var cardDto = new
            {
                id = revealedCard.TraitCard!.Id,
                category = revealedCard.TraitCard.Category.ToString(),
                categoryNamePl = GameEventService.GetCategoryNamePl(revealedCard.TraitCard.Category),
                value = revealedCard.TraitCard.Value,
                description = revealedCard.TraitCard.Description,
                isRevealed = revealedCard.IsRevealed,
                revealedOnDay = revealedCard.RevealedOnDay
            };

            // Powiadomienie na żywo dla ekranu Hosta/TV oraz pozostałych graczy
            await _hubContext.Clients.Group(code).SendAsync("CardRevealed", new
            {
                roomCode = code,
                playerId = revealedCard.PlayerId,
                nickname = revealedCard.Player.Nickname,
                day = revealedCard.RevealedOnDay,
                card = cardDto
            });

            // Wpis do Feedu Wydarzeń (Task 19)
            await _eventService.LogCardRevealedAsync(
                code,
                revealedCard.PlayerId,
                revealedCard.Player.Nickname,
                revealedCard.TraitCard.Category,
                revealedCard.TraitCard.Value);

            return Ok(new
            {
                message = "Karta cechy została pomyślnie odsłonięta.",
                playerId = revealedCard.PlayerId,
                card = cardDto
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message, error = ex.Message });
        }
    }

    // Pobranie pełnych 6 kart konkretnego gracza (dla widoku smartfona Twoja Karta)
    // GET: api/rooms/{roomCode}/cards/player/{playerId}
    [HttpGet("player/{playerId:guid}")]
    public async Task<IActionResult> GetPlayerCards(string roomCode, Guid playerId)
    {
        var code = roomCode.ToUpper().Trim();

        var cards = await _context.PlayerTraitCards
            .AsNoTracking()
            .Where(pt => pt.PlayerId == playerId && pt.Player != null && pt.Player.Room != null && pt.Player.Room.Code == code)
            .Select(pt => new
            {
                pt.TraitCard!.Id,
                Category = pt.TraitCard.Category.ToString(),
                pt.TraitCard.Value,
                pt.TraitCard.Description,
                pt.IsRevealed,
                pt.RevealedOnDay
            })
            .ToListAsync();

        if (cards.Count == 0)
            return NotFound(new { message = "Nie znaleziono kart dla tego gracza.", error = "Nie znaleziono kart dla tego gracza." });

        return Ok(cards);
    }

    // Pobranie kart wszystkich graczy w pokoju (ukryte karty są zamaskowane dla TV / stołu)
    // GET: api/rooms/{roomCode}/cards
    [HttpGet]
    public async Task<IActionResult> GetRoomCards(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();

        var playersWithCards = await _context.Players
            .AsNoTracking()
            .Where(p => p.Room != null && p.Room.Code == code)
            .Select(p => new
            {
                p.Id,
                p.Nickname,
                Cards = p.PlayerTraitCards.Select(pt => new
                {
                    Id = pt.IsRevealed ? pt.TraitCard!.Id : (int?)null,
                    Category = pt.TraitCard!.Category.ToString(),
                    Value = pt.IsRevealed ? pt.TraitCard.Value : "???",
                    Description = pt.IsRevealed ? pt.TraitCard.Description : null,
                    pt.IsRevealed,
                    pt.RevealedOnDay
                })
            })
            .ToListAsync();

        return Ok(playersWithCards);
    }
}

public record RevealCardRequest(Guid PlayerId, int TraitCardId);
