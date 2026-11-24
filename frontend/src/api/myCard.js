const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

const MOCK_CARD = {
  roomCode: 'A7X2',
  day: 1,
  phase: 'DayDiscussion',
  timeLeft: '02:45',
  role: 'Survivor',
  traits: [],
}

export async function getMyCard(roomCode, playerId) {
  const card = structuredClone(MOCK_CARD)
  if (roomCode) card.roomCode = roomCode

  if (roomCode && playerId) {
    const [roleRes, cardsRes] = await Promise.all([
      fetch(`${API_URL}/api/rooms/${roomCode}/players/${playerId}/role`),
      fetch(`${API_URL}/api/rooms/${roomCode}/cards`),
    ])

    if (roleRes.ok) {
      const roleData = await roleRes.json()
      card.role = roleData.role
    }

    if (cardsRes.ok) {
      const allPlayersCards = await cardsRes.json()
      const myData = allPlayersCards.find(
        (p) => String(p.id).toLowerCase() === String(playerId).toLowerCase()
      )
      if (myData && myData.cards?.length > 0) {
        card.traits = myData.cards.map((c) => ({
          category: c.category,
          value: c.value,
          isRevealed: Boolean(c.isRevealed),
        }))
      }
    }
  }

  return card
}