namespace Bunker.Api.Models;

public class GameSettingsDto
{
    public int DayDurationMinutes { get; set; } = 5;       // 1-10 MIN (по умолч. 5)
    public int NightDurationSeconds { get; set; } = 60;    // 30-120 S (по умолч. 60)
    public int VotingDurationSeconds { get; set; } = 45;   // 30-120 S (по умолч. 45)
    public int DaysCount { get; set; } = 5;                // 1-10 DNI (по умолч. 5)
    public int MaxPlayers { get; set; } = 8;               // 3-8 GRACZY (по умолч. 8)
    public string RevealOrder { get; set; } = "LOSOWA";    // "LOSOWA" lub "RĘCZNA"
    public bool SoundEnabled { get; set; } = true;         // WŁĄCZONY / WYŁĄCZONY
}

public class PlayerSessionDto
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Nickname { get; set; } = string.Empty;
    public string Initials => Nickname.Length >= 2 
        ? Nickname.Substring(0, 2).ToUpper() 
        : Nickname.ToUpper();
    public bool IsReady { get; set; } = true;
    public bool IsOnline { get; set; } = true;
}

public class RoomSession
{
    public string RoomCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public GameSettingsDto Settings { get; set; } = new();
    public List<PlayerSessionDto> Players { get; set; } = new();
    public string Status { get; set; } = "LOBBY"; // LOBBY, DAY, NIGHT, FINAL
}