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

        // Task 5: Data Seeding — 6 kategorii (30 kart startowych)
        modelBuilder.Entity<TraitCard>().HasData(
            // 1. Zawód (Profession)
            new TraitCard { Id = 1, Category = TraitCategory.Profession, Value = "Lekarz chirurg", Description = "Potrafi przeprowadzać operacje w warunkach polowych" },
            new TraitCard { Id = 2, Category = TraitCategory.Profession, Value = "Inżynier mechanik", Description = "Zna się na naprawie systemów wentylacji i generatorów" },
            new TraitCard { Id = 3, Category = TraitCategory.Profession, Value = "Botanik", Description = "Specjalista od uprawy roślin i hydroponiki" },
            new TraitCard { Id = 4, Category = TraitCategory.Profession, Value = "Żołnierz sił specjalnych", Description = "Wyszkolenie bojowe i obsługa broni" },
            new TraitCard { Id = 5, Category = TraitCategory.Profession, Value = "Influencer", Description = "Potrafi prowadzić transmisje na żywo, brak praktycznych umiejętności przetrwania" },

            // 2. Zdrowie (Health)
            new TraitCard { Id = 6, Category = TraitCategory.Health, Value = "Doskonałe zdrowie", Description = "Silna odporność i brak chorób przewlekłych" },
            new TraitCard { Id = 7, Category = TraitCategory.Health, Value = "Astma oskrzelowa", Description = "Wymaga inhalatora przy wysiłku i zapyleniu" },
            new TraitCard { Id = 8, Category = TraitCategory.Health, Value = "Cukrzyca typu 1", Description = "Wymaga regularnego podawania insuliny" },
            new TraitCard { Id = 9, Category = TraitCategory.Health, Value = "Krótkowzroczność (-5 D)", Description = "Bez okularów słabo widzi na odległość" },
            new TraitCard { Id = 10, Category = TraitCategory.Health, Value = "Alergia na kurz i pleśń", Description = "Częste kichanie i łzawienie oczu w zamkniętych pomieszczeniach" },

            // 3. Fobia (Phobia)
            new TraitCard { Id = 11, Category = TraitCategory.Phobia, Value = "Brak fobii", Description = "Stabilna psychika w sytuacjach kryzysowych" },
            new TraitCard { Id = 12, Category = TraitCategory.Phobia, Value = "Klaustrofobia", Description = "Paniczny lęk przed zamkniętymi i ciasnymi pomieszczeniami" },
            new TraitCard { Id = 13, Category = TraitCategory.Phobia, Value = "Arachnofobia", Description = "Paniczny lęk przed pająkami i owadami" },
            new TraitCard { Id = 14, Category = TraitCategory.Phobia, Value = "Nyktfobia", Description = "Silny lęk przed ciemnością i brakiem oświetlenia" },
            new TraitCard { Id = 15, Category = TraitCategory.Phobia, Value = "Mizofobia", Description = "Obsesyjny lęk przed brudem i zarazkami" },

            // 4. Hobby (Hobby)
            new TraitCard { Id = 16, Category = TraitCategory.Hobby, Value = "Survival i bushcraft", Description = "Umiejętność przetrwania w trudnych warunkach" },
            new TraitCard { Id = 17, Category = TraitCategory.Hobby, Value = "Gotowanie z konserw", Description = "Potrafi przygotować smaczny posiłek z minimalnych zapasów" },
            new TraitCard { Id = 18, Category = TraitCategory.Hobby, Value = "Krótkofalarstwo", Description = "Umiejętność obsługi i naprawy sprzętu radiowego" },
            new TraitCard { Id = 19, Category = TraitCategory.Hobby, Value = "Gra na gitarze", Description = "Podnosi morale grupy podczas długiej izolacji" },
            new TraitCard { Id = 20, Category = TraitCategory.Hobby, Value = "Gry planszowe i szachy", Description = "Rozwija myślenie strategiczne i organizuje czas wolny" },

            // 5. Ekwipunek (Equipment)
            new TraitCard { Id = 21, Category = TraitCategory.Equipment, Value = "Apteczka taktyczna", Description = "Zestaw opatrunków, antybiotyków i leków przeciwbólowych" },
            new TraitCard { Id = 22, Category = TraitCategory.Equipment, Value = "Skrzynka z narzędziami", Description = "Klucze, wkrętaki, lutownica i miernik napięcia" },
            new TraitCard { Id = 23, Category = TraitCategory.Equipment, Value = "Zapas nasion warzyw", Description = "Hermetycznie zapakowane nasiona do uprawy w bunkrze" },
            new TraitCard { Id = 24, Category = TraitCategory.Equipment, Value = "Licznik Geigera", Description = "Urządzenie do pomiaru poziomu promieniowania" },
            new TraitCard { Id = 25, Category = TraitCategory.Equipment, Value = "Dmuchany jednorożec", Description = "Zajmuje dużo miejsca i nie daje korzyści w bunkrze" },

            // 6. Wiek i Płeć (AgeAndGender)
            new TraitCard { Id = 26, Category = TraitCategory.AgeAndGender, Value = "Mężczyzna, 28 lat", Description = "W pełni sił fizycznych, płodny" },
            new TraitCard { Id = 27, Category = TraitCategory.AgeAndGender, Value = "Kobieta, 26 lat", Description = "W pełni sił fizycznych, płodna" },
            new TraitCard { Id = 28, Category = TraitCategory.AgeAndGender, Value = "Mężczyzna, 45 lat", Description = "Duże doświadczenie życiowe i dobra kondycja" },
            new TraitCard { Id = 29, Category = TraitCategory.AgeAndGender, Value = "Kobieta, 34 lata", Description = "Dobra kondycja fizyczna, wysoka odporność na stres" },
            new TraitCard { Id = 30, Category = TraitCategory.AgeAndGender, Value = "Mężczyzna, 68 lat", Description = "Emeryt, duże doświadczenie, ale ograniczona wydolność fizyczna" }
        );
    }
}