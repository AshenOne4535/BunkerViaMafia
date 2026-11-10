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

const MOCK_CARD = {
  roomCode: 'A7X2',
  day: 1,
  phase: 'DayDiscussion',
  timeLeft: '02:45',
  role: 'Traitor',
  traits: [
    { category: 'Profession', value: 'Mechanik', isRevealed: false },
    { category: 'Health', value: 'Zdrowy', isRevealed: false },
    { category: 'Phobia', value: 'Arachnofobia', isRevealed: true },
    { category: 'Hobby', value: 'Gry wideo', isRevealed: false },
    { category: 'Equipment', value: 'Apteczka', isRevealed: false },
    { category: 'AgeAndGender', value: '34, mężczyzna', isRevealed: false },
  ],
}

export async function getMyCard() {
  // symulacja opóźnienia sieci
  await new Promise((resolve) => setTimeout(resolve, 400))
  return structuredClone(MOCK_CARD)
}
