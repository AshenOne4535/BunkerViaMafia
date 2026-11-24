using Bunker.Api.Data;
using Bunker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Services;

public class CardAssignmentService
{
	private readonly BunkerDbContext _context;

	public CardAssignmentService(BunkerDbContext context)
	{
		_context = context;
	}

	/// <summary>
	/// Роздає кожному гравцю в кімнаті по 6 унікальних карток (по 1 з кожної категорії).
	/// </summary>
	public async Task AssignCardsToRoomAsync(string roomCode)
	{
		roomCode = roomCode.ToUpper().Trim();
		var room = await _context.Rooms
			.Include(r => r.Players)
				.ThenInclude(p => p.PlayerTraitCards)
			.FirstOrDefaultAsync(r => r.Code == roomCode);

		if (room == null)
			throw new InvalidOperationException($"Кімнату з кодом '{roomCode}' не знайдено.");

		var players = room.Players.ToList();
		if (players.Count == 0)
			throw new InvalidOperationException("У кімнаті немає гравців для роздачі карток.");

		// Очищаємо старі картки гравців, якщо роздача запускається повторно
		var existingCards = players.SelectMany(p => p.PlayerTraitCards).ToList();
		if (existingCards.Count > 0)
		{
			_context.PlayerTraitCards.RemoveRange(existingCards);
		}

		// Завантажуємо всі картки з бази та групуємо за категоріями
		var allCards = await _context.TraitCards.AsNoTracking().ToListAsync();
		var cardsByCategory = allCards
			.GroupBy(c => c.Category)
			.ToDictionary(g => g.Key, g => g.ToList());

		var categories = Enum.GetValues<TraitCategory>();
		var newAssignments = new List<PlayerTraitCard>();

		// Для кожної з 6 категорій тасуємо картки і видаємо по одній унікальній кожному гравцю
		foreach (var category in categories)
		{
			if (!cardsByCategory.TryGetValue(category, out var availableCards) || availableCards.Count == 0)
			{
				throw new InvalidOperationException(
					$"Brak kart w kategorii '{category}'. Dodaj karty do bazy (TraitCards).");
			}

			// Tasujemy karty. Gdy graczy jest wiecej niz kart w kategorii (w bazie jest po 5 kart),
			// karty powtarzaja sie u roznych graczy, ale kazdy gracz dostaje po jednej karcie z kategorii.
			var shuffledCards = availableCards
				.OrderBy(_ => Random.Shared.Next())
				.ToList();

			for (int i = 0; i < players.Count; i++)
			{
				newAssignments.Add(new PlayerTraitCard
				{
					PlayerId = players[i].Id,
					TraitCardId = shuffledCards[i % shuffledCards.Count].Id
				});
			}
		}

		await _context.PlayerTraitCards.AddRangeAsync(newAssignments);
		await _context.SaveChangesAsync();
	}
}