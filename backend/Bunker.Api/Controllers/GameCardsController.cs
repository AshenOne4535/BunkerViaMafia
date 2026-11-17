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

	// GET: api/rooms/{roomCode}/cards
	[HttpGet]
	public async Task<IActionResult> GetRoomCards(string roomCode)
	{
		var playersWithCards = await _context.Players
			.Where(p => p.Room != null && p.Room.Code == roomCode)
			.Select(p => new
			{
				p.Id,
				Cards = p.PlayerTraitCards.Select(pt => new
				{
					pt.TraitCard!.Id,
					Category = pt.TraitCard.Category.ToString(),
					pt.TraitCard.Value,
					pt.TraitCard.Description
				})
			})
			.ToListAsync();

		return Ok(playersWithCards);
	}
}