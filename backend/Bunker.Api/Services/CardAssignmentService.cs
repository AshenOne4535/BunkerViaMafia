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
    /// Роздає кожному гравцю в кімнаті по 6 карток характеристик (по 1 з кожної категорії).
    /// </summary>
    public async Task AssignCardsToRoomAsync(string roomCode)
    {
        roomCode = roomCode.ToUpper().Trim();
        var room = await _context.Rooms
            .Include(r => r.Players)
                .ThenInclude(p => p.PlayerTraitCards)
            .FirstOrDefaultAsync(r => r.Code == roomCode);

        if (room == null)
            throw new InvalidOperationException($"Pokój o kodzie '{roomCode}' nie został znaleziony.");

        var players = room.Players.ToList();
        if (players.Count == 0)
            throw new InvalidOperationException("W pokoju nie ma graczy do przydzielenia kart.");

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

        // Tasujemy karty. Gdy graczy jest więcej niż kart w kategorii (w bazie jest po 5 kart),
        // karty powtarzają się u różnych graczy, ale każdy gracz dostaje po jednej karcie z kategorii.
        foreach (var category in categories)
        {
            if (!cardsByCategory.TryGetValue(category, out var availableCards) || availableCards.Count == 0)
            {
                throw new InvalidOperationException(
                    $"Brak kart w kategorii '{category}'. Dodaj karty do bazy (TraitCards).");
            }

            var shuffledCards = availableCards
                .OrderBy(_ => Random.Shared.Next())
                .ToList();

            for (int i = 0; i < players.Count; i++)
            {
                newAssignments.Add(new PlayerTraitCard
                {
                    PlayerId = players[i].Id,
                    TraitCardId = shuffledCards[i % shuffledCards.Count].Id,
                    IsRevealed = false,
                    RevealedOnDay = null
                });
            }
        }

        await _context.PlayerTraitCards.AddRangeAsync(newAssignments);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Task 16: Odsłania wybraną kartę cechy gracza (akcja ze smartfona).
    /// </summary>
    public async Task<PlayerTraitCard> RevealCardAsync(string roomCode, Guid playerId, int traitCardId)
    {
        roomCode = roomCode.ToUpper().Trim();

        var playerCard = await _context.PlayerTraitCards
            .Include(pt => pt.Player)
                .ThenInclude(p => p!.Room)
            .Include(pt => pt.TraitCard)
            .FirstOrDefaultAsync(pt =>
                pt.PlayerId == playerId &&
                pt.TraitCardId == traitCardId &&
                pt.Player != null &&
                pt.Player.Room != null &&
                pt.Player.Room.Code == roomCode);

        if (playerCard == null)
            throw new InvalidOperationException("Nie znaleziono tej karty u wybranego gracza w podanym pokoju.");

        var room = playerCard.Player.Room;
        if (room.CurrentPhase == GamePhase.Lobby)
            throw new InvalidOperationException("Nie można odsłaniać kart przed rozpoczęciem gry.");

        if (room.CurrentPhase == GamePhase.Ended)
            throw new InvalidOperationException("Gra w tym pokoju już się zakończyła.");

        if (playerCard.IsRevealed)
            throw new InvalidOperationException("Ta karta cechy została już wcześniej odsłonięta.");

        playerCard.IsRevealed = true;
        playerCard.RevealedOnDay = room.CurrentDay;
        await _context.SaveChangesAsync();

        return playerCard;
    }
}
