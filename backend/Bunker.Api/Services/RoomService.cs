using Bunker.Api.Data;
using Bunker.Api.Models;
using Microsoft.EntityFrameworkCore;
using QRCoder;

namespace Bunker.Api.Services;

public record CreateRoomResult(Room Room, string QrCodeBase64, string JoinUrl);

public interface IRoomService
{
    Task<CreateRoomResult> CreateRoomAsync(string frontendBaseUrl);
    Task<Room?> GetRoomAsync(string roomCode);
    Task<Player> JoinRoomAsync(string roomCode, string nickname);
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
            IsHost = room.Players.Count == 0, // Первый вошедший может считаться хостом, если хост заходит как игрок
            IsReady = true,
            IsOnline = true
        };

        _db.Players.Add(player);
        await _db.SaveChangesAsync();

        return player;
    }

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