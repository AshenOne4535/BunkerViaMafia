// TYMCZASOWE DANE dla ekranu „Twoja Karta" (Task 15).
//
// TODO (Task 3 SignalR, Task 13 losowanie ról, Task 14 przydział kart):
// podmienić `getMyCard` na prawdziwe wywołanie serwera. Reszta aplikacji
// używa tylko tej funkcji, więc zmiana ma być w jednym miejscu.
//
// Kształt danych odpowiada modelom backendu:
//   role         -> enum SecretRole        (Survivor | Traitor | Doctor | Scientist)
//   phase        -> enum GamePhase         (DayDiscussion | NightActions | ...)
//   traits[].category    -> enum TraitCategory (6 kategorii)
//   traits[].isRevealed  -> PlayerTraitCard.IsRevealed (Znane / Zakryte)
const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

const MOCK_CARD = {
  roomCode: 'A7X2',
  day: 1,
  phase: 'DayDiscussion',
  timeLeft: '02:45',
  role: 'Survivor',
  traits: [
    { category: 'Profession', value: 'Mechanik', isRevealed: false },
    { category: 'Health', value: 'Zdrowy', isRevealed: false },
    { category: 'Phobia', value: 'Arachnofobia', isRevealed: true },
    { category: 'Hobby', value: 'Gry wideo', isRevealed: false },
    { category: 'Equipment', value: 'Apteczka', isRevealed: false },
    { category: 'AgeAndGender', value: '34, mężczyzna', isRevealed: false },
  ],
}

export async function getMyCard(roomCode, playerId) {
  const card = structuredClone(MOCK_CARD)
  if (roomCode) card.roomCode = roomCode

  if (roomCode && playerId) {
    const res = await fetch(`${API_URL}/api/rooms/${roomCode}/players/${playerId}/role`)
    if (res.ok) {
      const roleData = await res.json()
      card.role = roleData.role // Настоящая роль из БД (Survivor | Traitor | Doctor | Scientist)
    }
  }

  return card
}
