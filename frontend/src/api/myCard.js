const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

const MOCK_CARD = {
  roomCode: 'A7X2',
  day: 1,
  phase: 'Lobby',
  timeLeft: '02:45',
  role: null, // <-- До старта игры роли ещё нет!
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
      card.role = roleData.role
    }
  }

  return card
}
