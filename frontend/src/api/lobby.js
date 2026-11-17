// TYMCZASOWE DANE dla ekranu „Poczekalnia" (Task 12).
//
// TODO (Task 3 / Task 10 SignalR): podmienić `getLobby` na prawdziwe dane.
// Serwer wysyła zdarzenie `PlayerJoined`, a host zna listę graczy pokoju.
// Reszta aplikacji używa tylko tej funkcji, więc zmiana ma być w jednym miejscu.

export const MAX_PLAYERS = 8

const MOCK_OTHERS = ['Doktor Kot', 'Marek', 'Nika', 'Wilk']

export async function getLobby({ roomCode, nick }) {
  // symulacja opóźnienia sieci
  await new Promise((resolve) => setTimeout(resolve, 400))
  return {
    roomCode,
    maxPlayers: MAX_PLAYERS,
    players: [
      { id: 'me', nickname: nick, isReady: true, isMe: true },
      ...MOCK_OTHERS.map((name, i) => ({
        id: `p${i + 2}`,
        nickname: name,
        isReady: true,
        isMe: false,
      })),
    ],
  }
}
