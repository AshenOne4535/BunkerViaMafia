using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Bunker.Api.Models;

public class GameEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [ForeignKey(nameof(Room))]
    public Guid RoomId { get; set; }

    [JsonIgnore]
    public Room Room { get; set; } = null!;

    public GameEventType EventType { get; set; } = GameEventType.System;

    [Required]
    [MaxLength(300)]
    public string Message { get; set; } = string.Empty;

    public int Day { get; set; } = 1;
    public GamePhase Phase { get; set; } = GamePhase.Lobby;

    public Guid? ActorPlayerId { get; set; }

    [MaxLength(50)]
    public string? ActorNickname { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
