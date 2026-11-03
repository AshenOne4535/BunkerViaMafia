using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bunker.Api.Models;

public class PlayerTraitCard
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [ForeignKey(nameof(Player))]
    public Guid PlayerId { get; set; }
    public Player Player { get; set; } = null!;

    [ForeignKey(nameof(TraitCard))]
    public int TraitCardId { get; set; }
    public TraitCard TraitCard { get; set; } = null!;

    // Чи відкрита картка під час денної фази (Znane / Zakryte)
    public bool IsRevealed { get; set; } = false;
    public int? RevealedOnDay { get; set; }
}