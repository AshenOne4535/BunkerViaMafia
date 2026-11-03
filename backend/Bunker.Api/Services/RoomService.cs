using System.Collections.Concurrent;
using Bunker.Api.Models;
using QRCoder;

namespace Bunker.Api.Services;

public interface IRoomService
{
    RoomSession CreateRoom(string frontendBaseUrl, out string qrCodeBase64, out string joinUrl);
    RoomSession? GetRoom(string roomCode);
    PlayerSessionDto JoinRoom(string roomCode, string nickname);
}

public class RoomService : IRoomService
{
    private readonly ConcurrentDictionary<string, RoomSession> _rooms = new();
    
    // Алфавит без похожих символов (0, O, I, 1), чтобы игроки не путались при вводе с экрана ТВ
    private const string AllowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public RoomSession CreateRoom(string frontendBaseUrl, out string qrCodeBase64, out string joinUrl)
    {
        string code;
        do
        {
            code = GenerateCode(4);
        } while (_rooms.ContainsKey(code));

        var room = new RoomSession { RoomCode = code };
        _rooms[code] = room;

        // Ссылка для входа с телефона (Task 11 подхватит параметр ?code=...)
        joinUrl = $"{frontendBaseUrl.TrimEnd('/')}/join?code={code}";
        qrCodeBase64 = GenerateQrCodeBase64(joinUrl);

        return room;
    }

    public RoomSession? GetRoom(string roomCode)
    {
        if (string.IsNullOrWhiteSpace(roomCode)) return null;
        _rooms.TryGetValue(roomCode.ToUpper().Trim(), out var room);
        return room;
    }

    public PlayerSessionDto JoinRoom(string roomCode, string nickname)
    {
        var code = roomCode.ToUpper().Trim();
        if (!_rooms.TryGetValue(code, out var room))
            throw new Exception("Pokój o podanym kodzie nie istnieje.");

        if (room.Status != "LOBBY")
            throw new Exception("Gra w tym pokoju już się rozpoczęła.");

        if (room.Players.Count >= room.Settings.MaxPlayers)
            throw new Exception("Pokój jest pełny.");

        if (room.Players.Any(p => p.Nickname.Equals(nickname.Trim(), StringComparison.OrdinalIgnoreCase)))
            throw new Exception("Gracz o takim nicku już znajduje się w pokoju.");

        var player = new PlayerSessionDto { Nickname = nickname.Trim() };
        room.Players.Add(player);
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