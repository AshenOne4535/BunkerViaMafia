const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

async function parseJsonOrThrow(res, fallbackMessage) {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || data?.error || fallbackMessage)
  }
  return data
}

export async function createHostRoom(frontendUrl = window.location.origin) {
  const res = await fetch(
    `${API_URL}/api/rooms/create?frontendUrl=${encodeURIComponent(frontendUrl)}`,
    { method: 'POST' }
  )
  return parseJsonOrThrow(res, 'Błąd tworzenia pokoju.')
}

export async function updateRoomSettings(roomCode, settings) {
  const code = encodeURIComponent(roomCode)
  const payload = {
    dayDurationMinutes: settings?.dayMinutes ?? 5,
    nightDurationSeconds: settings?.nightSeconds ?? 60,
    votingDurationSeconds: settings?.voteSeconds ?? 45,
    maxDays: settings?.days ?? 5,
    maxPlayers: settings?.maxPlayers ?? 8,
    isRandomRevealOrder: settings?.revealOrder ? settings.revealOrder === 'random' : true,
    isSoundEnabled: settings?.sound ?? true,
  }

  const res = await fetch(`${API_URL}/api/rooms/${code}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseJsonOrThrow(res, 'Nie udało się zapisać ustawień gry.')
}

export async function assignRoomCards(roomCode) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/cards/assign`, {
    method: 'POST',
  })
  return parseJsonOrThrow(res, 'Błąd przydziału kart cech.')
}

export async function assignRoomRoles(roomCode) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/assign-roles`, {
    method: 'POST',
  })
  return parseJsonOrThrow(res, 'Błąd losowania tajnych ról.')
}

export async function getRoomPublicCards(roomCode) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/cards`)
  return parseJsonOrThrow(res, 'Nie udało się pobrać kart graczy.')
}

export async function getRoomEvents(roomCode, limit = 50) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/events?limit=${limit}&newestFirst=true`)
  return parseJsonOrThrow(res, 'Nie udało się pobrać feedu wydarzeń.')
}

export async function getRoomTimer(roomCode) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/timer`)
  return parseJsonOrThrow(res, 'Nie udało się pobrać stanu zegara.')
}

export async function pauseRoomTimer(roomCode) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/timer/pause`, {
    method: 'POST',
  })
  return parseJsonOrThrow(res, 'Nie udało się wstrzymać zegara.')
}

export async function resumeRoomTimer(roomCode) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/timer/resume`, {
    method: 'POST',
  })
  return parseJsonOrThrow(res, 'Nie udało się wznowić zegara.')
}

export async function resetRoomTimer(roomCode) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/timer/reset`, {
    method: 'POST',
  })
  return parseJsonOrThrow(res, 'Nie udało się zresetować zegara.')
}

export async function startRoomTimer(roomCode, durationSeconds) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/timer/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(durationSeconds ? { durationSeconds } : {}),
  })
  return parseJsonOrThrow(res, 'Nie udało się uruchomić zegara.')
}

export async function advanceRoomNextDay(roomCode) {
  const code = encodeURIComponent(roomCode)
  const res = await fetch(`${API_URL}/api/rooms/${code}/timer/next-day`, {
    method: 'POST',
  })
  return parseJsonOrThrow(res, 'Nie udało się przejść do kolejnego dnia.')
}
