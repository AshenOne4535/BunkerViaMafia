const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

export const MAX_PLAYERS = 8

export async function getLobby({ roomCode, nick }) {
  const res = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(roomCode)}`)
  if (!res.ok) {
    throw new Error('Nie udało się pobrać listy graczy.')
  }

  const room = await res.json()
  const players = (room.players || []).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    isReady: p.isReady,
    isMe: p.nickname.toLowerCase() === nick.trim().toLowerCase(),
  }))

  return {
    roomCode: room.code,
    maxPlayers: room.maxPlayers || MAX_PLAYERS,
    players,
  }
}