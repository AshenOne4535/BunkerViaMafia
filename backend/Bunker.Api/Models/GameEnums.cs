namespace Bunker.Api.Models;

public enum GamePhase
{
    Lobby = 0,
    DayDiscussion = 1,
    NightActions = 2,
    FinalVoting = 3,
    Ended = 4
}

public enum SecretRole
{
    None = 0,
    Survivor = 1,   // Ocalały
    Traitor = 2,    // Zarażony / Zdrajca (Sabotażysta)
    Doctor = 3,     // Lekarz
    Scientist = 4   // Naukowiec
}

public enum TraitCategory
{
    Profession = 1,   // Zawód
    Health = 2,       // Zdrowie
    Phobia = 3,       // Fobia
    Hobby = 4,        // Hobby
    Equipment = 5,    // Ekwipunek
    AgeAndGender = 6  // Wiek i Płeć
}

public enum GameEventType
{
    System = 0,
    PlayerJoined = 1,
    GameStarted = 2,
    DayStarted = 3,
    CardRevealed = 4,
    TimerWarning = 5,
    TimerEnded = 6,
    PhaseChanged = 7,
    NightAction = 8,
    PlayerSilenced = 9,
    Voting = 10
}