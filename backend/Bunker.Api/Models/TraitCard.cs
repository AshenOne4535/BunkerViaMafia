using System.ComponentModel.DataAnnotations;

namespace Bunker.Api.Models;

public class TraitCard
{
    [Key]
    public int Id { get; set; }

    [Required]
    public TraitCategory Category { get; set; }

    [Required]
    [MaxLength(100)]
    public string Value { get; set; } = string.Empty; // Напр. "Lekarka", "Arachnofobia", "Apteczka"

    [MaxLength(250)]
    public string? Description { get; set; } // Напр. "Medycyna ratunkowa"

    public ICollection<PlayerTraitCard> PlayerTraitCards { get; set; } = new List<PlayerTraitCard>();
}