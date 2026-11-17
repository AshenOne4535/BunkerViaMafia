using Bunker.Api.Data;
using Bunker.Api.Models;
using Microsoft.EntityFrameworkCore;
using QRCoder;

namespace Bunker.Api.Services;

public record CreateRoomResult(Room Room, string QrCodeBase64, string JoinUrl);

public record PlayerRoleAssignmentDto(
    Guid PlayerId,
    string Nickname,
    SecretRole Role,
    string RoleNamePl,
    string RoleDescriptionPl,
    string? ConnectionId
);

public interface IRoomService
{
    Task<CreateRoomResult> CreateRoomAsync(string frontendBaseUrl);
    Task<Room?> GetRoomAsync(string roomCode);
    Task<Player> JoinRoomAsync(string roomCode, string nickname);
    Task<IReadOnlyList<PlayerRoleAssignmentDto>> AssignSecretRolesAsync(string roomCode);
    Task<PlayerRoleAssignmentDto> GetPlayerRoleAsync(string roomCode, Guid playerId);
}

public class RoomService : IRoomService
{
    private readonly BunkerDbContext _db;

    // Алфавит без похожих символов (0, O, I, 1)
    private const string AllowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public RoomService(BunkerDbContext db)
    {
        _db = db;
    }

    public async Task<CreateRoomResult> CreateRoomAsync(string frontendBaseUrl)
    {
        string code;
        do
        {
            code = GenerateCode(4);
        } while (await _db.Rooms.AnyAsync(r => r.Code == code));

        var room = new Room
        {
            Code = code,
            CurrentPhase = GamePhase.Lobby,
            CurrentDay = 1,
            CreatedAt = DateTime.UtcNow
        };

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync();

        var joinUrl = $"{frontendBaseUrl.TrimEnd('/')}/join?code={code}";
        var qrCodeBase64 = GenerateQrCodeBase64(joinUrl);

        return new CreateRoomResult(room, qrCodeBase64, joinUrl);
    }

    public async Task<Room?> GetRoomAsync(string roomCode)
    {
        if (string.IsNullOrWhiteSpace(roomCode)) return null;
        var code = roomCode.ToUpper().Trim();

        return await _db.Rooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Code == code);
    }

    public async Task<Player> JoinRoomAsync(string roomCode, string nickname)
    {
        var code = roomCode.ToUpper().Trim();
        var cleanNick = nickname.Trim();

        var room = await _db.Rooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Code == code);

        if (room == null)
            throw new Exception("Pokój o podanym kodzie nie istnieje.");

        if (room.CurrentPhase != GamePhase.Lobby)
            throw new Exception("Gra w tym pokoju już się rozpoczęła.");

        if (room.Players.Count >= room.MaxPlayers)
            throw new Exception("Pokój jest pełny.");

        if (room.Players.Any(p => p.Nickname.Equals(cleanNick, StringComparison.OrdinalIgnoreCase)))
            throw new Exception("Gracz o takim nicku już znajduje się w pokoju.");

        var player = new Player
        {
            RoomId = room.Id,
            Nickname = cleanNick,
            IsHost = room.Players.Count == 0,
            IsReady = true,
            IsOnline = true
        };

        _db.Players.Add(player);
        await _db.SaveChangesAsync();

        return player;
    }

    // Task 13: Algorytm losowania tajnych ról (Ocalały, Zdrajca, Lekarz, Naukowiec)
    public async Task<IReadOnlyList<PlayerRoleAssignmentDto>> AssignSecretRolesAsync(string roomCode)
    {
        if (string.IsNullOrWhiteSpace(roomCode))
            throw new Exception("Kod pokoju jest wymagany.");

        var code = roomCode.ToUpper().Trim();

        var room = await _db.Rooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Code == code);

        if (room == null)
            throw new Exception("Pokój o podanym kodzie nie istnieje.");

        var players = room.Players.ToList();
        if (players.Count < 3)
            throw new Exception("Do wylosowania ról potrzebnych jest minimum 3 graczy.");

        var rolePool = BuildRolePool(players.Count);
        ShuffleRoles(rolePool);

        var assignments = new List<PlayerRoleAssignmentDto>(players.Count);

        for (int i = 0; i < players.Count; i++)
        {
            players[i].Role = rolePool[i];
            players[i].IsSilenced = false;

            var (namePl, descPl) = GetRoleMetadata(players[i].Role);
            assignments.Add(new PlayerRoleAssignmentDto(
                players[i].Id,
                players[i].Nickname,
                players[i].Role,
                namePl,
                descPl,
                players[i].ConnectionId
            ));
        }

        await _db.SaveChangesAsync();
        return assignments;
    }

    public async Task<PlayerRoleAssignmentDto> GetPlayerRoleAsync(string roomCode, Guid playerId)
    {
        var code = roomCode.ToUpper().Trim();

        var player = await _db.Players
            .Include(p => p.Room)
            .FirstOrDefaultAsync(p => p.Id == playerId && p.Room.Code == code);

        if (player == null)
            throw new Exception("Gracz nie został znaleziony w tym pokoju.");

        var (namePl, descPl) = GetRoleMetadata(player.Role);
        return new PlayerRoleAssignmentDto(
            player.Id,
            player.Nickname,
            player.Role,
            namePl,
            descPl,
            player.ConnectionId
        );
    }

    private static List<SecretRole> BuildRolePool(int playerCount)
    {
        var roles = new List<SecretRole>(playerCount);

        if (playerCount == 3)
        {
            roles.Add(SecretRole.Traitor);
            roles.Add(SecretRole.Doctor);
            roles.Add(SecretRole.Survivor);
            return roles;
        }

        // Dla 4-7 graczy: 1 Zdrajca, 1 Lekarz, 1 Naukowiec + Ocalali
        // Dla 8+ graczy: 2 Zdrajców, 1 Lekarz, 1 Naukowiec + Ocalali
        int traitorCount = playerCount >= 8 ? 2 : 1;

        for (int i = 0; i < traitorCount; i++)
            roles.Add(SecretRole.Traitor);

        roles.Add(SecretRole.Doctor);
        roles.Add(SecretRole.Scientist);

        while (roles.Count < playerCount)
            roles.Add(SecretRole.Survivor);

        return roles;
    }

    // Algorytm tasowania Fishera-Yatesa
    private static void ShuffleRoles(IList<SecretRole> roles)
    {
        var rng = Random.Shared;
        for (int i = roles.Count - 1; i > 0; i--)
        {
            int j = rng.Next(i + 1);
            (roles[i], roles[j]) = (roles[j], roles[i]);
        }
    }

    private static (string NamePl, string DescriptionPl) GetRoleMetadata(SecretRole role) => role switch
    {
        SecretRole.Survivor => (
            "Ocalały",
            "Twoim celem jest zdobycie miejsca w bunkrze i niedopuszczenie do wejścia Zdrajcy."
        ),
        SecretRole.Traitor => (
            "Zdrajca",
            "Sabotuj grupę w nocy (pozbawiaj głosu wybranych graczy) i dostań się do bunkra nierozpoznany."
        ),
        SecretRole.Doctor => (
            "Lekarz",
            "W nocy możesz uchronić wybranego gracza przed sabotażem Zdrajcy i przywrócić mu głos."
        ),
        SecretRole.Scientist => (
            "Naukowiec",
            "W nocy możesz zbadać wybranego gracza lub odkryć ukrytą informację o jego karcie."
        ),
        _ => ("Brak roli", "Rola nie została jeszcze przydzielona.")
    };

    private static string GenerateCode(int length)
    {
        var random = Random.Shared;
        return new string(Enumerable.Repeat(AllowedChars, length)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }

    private static string GenerateQrCodeBase64(string url)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        var qrBytes = qrCode.GetGraphic(10);
        return $"data:image/png;base64,{Convert.ToBase64String(qrBytes)}";
    }
}