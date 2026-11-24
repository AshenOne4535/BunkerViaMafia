const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

const CATEGORY_ORDER = [
  'Profession',
  'Health',
  'Phobia',
  'Hobby',
  'Equipment',
  'AgeAndGender',
]

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
    const code = encodeURIComponent(roomCode)
    const pid = encodeURIComponent(playerId)

    const [roleRes, cardsRes, timerRes] = await Promise.all([
      fetch(`${API_URL}/api/rooms/${code}/players/${pid}/role`),
      fetch(`${API_URL}/api/rooms/${code}/cards/player/${pid}`),
      fetch(`${API_URL}/api/rooms/${code}/timer`).catch(() => null),
    ])

    if (roleRes.ok) {
      const roleData = await roleRes.json()
      card.role = roleData.role
    }

    if (cardsRes.ok) {
      const myCards = await cardsRes.json()
      if (Array.isArray(myCards) && myCards.length > 0) {
        card.traits = myCards
          .map((c) => ({
            id: c.id,
            category: c.category,
            value: c.value,
            description: c.description ?? null,
            isRevealed: Boolean(c.isRevealed),
            revealedOnDay: c.revealedOnDay ?? null,
          }))
          .sort(
            (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
          )
      }
    }

    if (timerRes?.ok) {
      const timerData = await timerRes.json()
      card.day = timerData.currentDay ?? card.day
      card.phase = timerData.currentPhase ?? card.phase
      card.timeLeft = timerData.formattedTime ?? card.timeLeft
    }
  }

  return card
}

export async function revealMyTraitCard({ roomCode, playerId, traitCardId }) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/cards/reveal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      traitCardId,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || data?.error || 'Nie udało się odsłonić karty.')
  }

  return data
}
