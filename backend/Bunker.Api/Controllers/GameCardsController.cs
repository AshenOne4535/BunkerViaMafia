using Bunker.Api.Data;
using Bunker.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Controllers;

[ApiController]
[Route("api/rooms/{roomCode}/cards")]
public class GameCardsController : ControllerBase
{
    private readonly CardAssignmentService _cardAssignmentService;
    private readonly BunkerDbContext _context;

    public GameCardsController(CardAssignmentService cardAssignmentService, BunkerDbContext context)
    {
        _cardAssignmentService = cardAssignmentService;
        _context = context;
    }

    // POST: api/rooms/{roomCode}/cards/assign
    [HttpPost("assign")]
    public async Task<IActionResult> AssignCards(string roomCode)
    {
        try
        {
            await _cardAssignmentService.AssignCardsToRoomAsync(roomCode);
            return Ok(new { message = "По 6 унікальних карток успішно роздано всім гравцям кімнати." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // POST: api/rooms/{roomCode}/cards/reveal
    [HttpPost("reveal")]
    public async Task<IActionResult> RevealCard(string roomCode, [FromBody] RevealCardRequest request)
    {
        try
        {
            var revealedCard = await _cardAssignmentService.RevealCardAsync(
                roomCode,
                request.PlayerId,
                request.TraitCardId);

            return Ok(new
            {
                message = "Картку успішно відкрито.",
                playerId = revealedCard.PlayerId,
                card = new
                {
                    revealedCard.TraitCard!.Id,
                    Category = revealedCard.TraitCard.Category.ToString(),
                    revealedCard.TraitCard.Value,
                    revealedCard.TraitCard.Description,
                    revealedCard.IsRevealed
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // GET: api/rooms/{roomCode}/cards/player/{playerId}
    [HttpGet("player/{playerId}")]
    public async Task<IActionResult> GetPlayerCards(string roomCode, Guid playerId)
    {
        var code = roomCode.ToUpper().Trim();

        var cards = await _context.PlayerTraitCards
            .Where(pt => pt.PlayerId == playerId && pt.Player != null && pt.Player.Room != null && pt.Player.Room.Code == code)
            .Select(pt => new
            {
                pt.TraitCard!.Id,
                Category = pt.TraitCard.Category.ToString(),
                pt.TraitCard.Value,
                pt.TraitCard.Description,
                pt.IsRevealed
            })
            .ToListAsync();

        if (cards.Count == 0)
            return NotFound(new { error = "Карток для цього гравця не знайдено." });

        return Ok(cards);
    }

    // GET: api/rooms/{roomCode}/cards
    [HttpGet]
    public async Task<IActionResult> GetRoomCards(string roomCode)
    {
        var code = roomCode.ToUpper().Trim();

        var playersWithCards = await _context.Players
            .Where(p => p.Room != null && p.Room.Code == code)
            .Select(p => new
            {
                p.Id,
                Cards = p.PlayerTraitCards.Select(pt => new
                {
                    Id = pt.IsRevealed ? pt.TraitCard!.Id : (int?)null,
                    Category = pt.TraitCard!.Category.ToString(),
                    Value = pt.IsRevealed ? pt.TraitCard.Value : "???",
                    Description = pt.IsRevealed ? pt.TraitCard.Description : null,
                    pt.IsRevealed
                })
            })
            .ToListAsync();

        return Ok(playersWithCards);
    }
}

public record RevealCardRequest(Guid PlayerId, int TraitCardId);