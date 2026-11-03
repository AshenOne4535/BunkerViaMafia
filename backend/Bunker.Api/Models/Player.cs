using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bunker.Api.Models;

public class Player
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string Nickname { get; set; } = string.Empty;

    // Для SignalR та механізму Reconnect
    public string? ConnectionId { get; set; }

    public bool IsHost { get; set; } = false;
    public bool IsReady { get; set; } = true;
    public bool IsOnline { get; set; } = true;

    // Ігрова логіка
    public SecretRole Role { get; set; } = SecretRole.None;
    public bool IsSilenced { get; set; } = false; // Статус "Pozbawiony głosu" після саботажу вночі
    public bool SurvivedInBunker { get; set; } = false;

    // Зовнішній ключ до Room
    [ForeignKey(nameof(Room))]
    public Guid RoomId { get; set; }
    public Room Room { get; set; } = null!;

    // Картки характеристик, видані гравцю (6 штук на матч)
    public ICollection<PlayerTraitCard> PlayerTraitCards { get; set; } = new List<PlayerTraitCard>();
}