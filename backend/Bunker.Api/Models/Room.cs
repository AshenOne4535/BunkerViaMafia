using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Bunker.Api.Models;

public class Room
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(4)]
    public string Code { get; set; } = string.Empty; // Напр. "A7X2"

    public GamePhase CurrentPhase { get; set; } = GamePhase.Lobby;
    public int CurrentDay { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Налаштування гри (Ustawienia Gry з Lobby TV)
    public int DayDurationMinutes { get; set; } = 5;        // 1-10 хв
    public int NightDurationSeconds { get; set; } = 60;     // 30-120 с
    public int VotingDurationSeconds { get; set; } = 45;    // 30-120 с
    public int MaxDays { get; set; } = 5;                   // 1-10 днів
    public int MaxPlayers { get; set; } = 8;                // 3-8 гравців
    public int BunkerCapacity { get; set; } = 5;            // Кількість місць у бункері
    public bool IsRandomRevealOrder { get; set; } = true;   // Losowa / Ręczna
    public bool IsSoundEnabled { get; set; } = true;        // Włączony / Wyłączony

    // Task 20: Serwerowy zegar dyskusji
    public DateTime? PhaseStartedAtUtc { get; set; }
    public DateTime? PhaseEndsAtUtc { get; set; }
    public bool IsTimerPaused { get; set; } = false;
    public int? PausedRemainingSeconds { get; set; }

    // Навігаційні властивості
    public ICollection<Player> Players { get; set; } = new List<Player>();

    [JsonIgnore]
    public ICollection<GameEvent> Events { get; set; } = new List<GameEvent>();
}