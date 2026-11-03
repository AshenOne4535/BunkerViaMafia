using Bunker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Bunker.Api.Data;

public class BunkerDbContext : DbContext
{
    public BunkerDbContext(DbContextOptions<BunkerDbContext> options) : base(options)
    {
    }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<TraitCard> TraitCards => Set<TraitCard>();
    public DbSet<PlayerTraitCard> PlayerTraitCards => Set<PlayerTraitCard>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Room>()
            .HasIndex(r => r.Code)
            .IsUnique();

        modelBuilder.Entity<Player>()
            .HasOne(p => p.Room)
            .WithMany(r => r.Players)
            .HasForeignKey(p => p.RoomId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PlayerTraitCard>()
            .HasOne(pt => pt.Player)
            .WithMany(p => p.PlayerTraitCards)
            .HasForeignKey(pt => pt.PlayerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PlayerTraitCard>()
            .HasOne(pt => pt.TraitCard)
            .WithMany(t => t.PlayerTraitCards)
            .HasForeignKey(pt => pt.TraitCardId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PlayerTraitCard>()
            .HasIndex(pt => new { pt.PlayerId, pt.TraitCardId })
            .IsUnique();
    }
}