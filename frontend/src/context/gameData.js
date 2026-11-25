// Kategorie kart cech zgodne z enumem TraitCategory na backendzie (Task 5, 14, 16)
export const TRAIT_CATEGORIES = [
  { key: 'Profession', label: 'Zawód', short: 'ZAWÓD' },
  { key: 'Health', label: 'Zdrowie', short: 'ZDROWIE' },
  { key: 'Phobia', label: 'Fobia', short: 'FOBIA' },
  { key: 'Hobby', label: 'Hobby', short: 'HOBBY' },
  { key: 'Equipment', label: 'Ekwipunek', short: 'EKWI.' },
  { key: 'AgeAndGender', label: 'Wiek i płeć', short: 'WIEK I PŁEĆ' },
]

const LEGACY_CATEGORY_ALIASES = {
  zawod: 'Profession',
  zdrowie: 'Health',
  fobia: 'Phobia',
  hobby: 'Hobby',
  ekwipunek: 'Equipment',
  wiekPlec: 'AgeAndGender',
}

export function normalizeTraitKey(rawKey) {
  if (!rawKey) return null
  if (TRAIT_CATEGORIES.some((c) => c.key === rawKey)) return rawKey
  return LEGACY_CATEGORY_ALIASES[rawKey] ?? rawKey
}

const EVENT_TYPE_META = {
  System: { label: 'System B-07', tone: 'neutral' },
  PlayerJoined: { label: 'Załoga', tone: 'ok' },
  GameStarted: { label: 'Start gry', tone: 'ok' },
  DayStarted: { label: 'Nowy dzień', tone: 'ok' },
  CardRevealed: { label: 'Ujawnienie', tone: 'ok' },
  TimerWarning: { label: 'Ostrzeżenie', tone: 'warn' },
  TimerEnded: { label: 'Koniec czasu', tone: 'danger' },
  PhaseChanged: { label: 'Zmiana fazy', tone: 'ok' },
  NightAction: { label: 'Noc', tone: 'neutral' },
  PlayerSilenced: { label: 'Sabotaż', tone: 'danger' },
  Voting: { label: 'Głosowanie', tone: 'ok' },
}

export function formatEventClock(isoString) {
  if (!isoString) return '--:--'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function mapServerEvent(dto) {
  const meta = EVENT_TYPE_META[dto.eventType] ?? EVENT_TYPE_META.System
  return {
    id: dto.id,
    time: formatEventClock(dto.createdAt),
    type: meta.label,
    tone: meta.tone,
    day: dto.day ?? 1,
    text: dto.message,
  }
}

export function mapServerPhase(serverPhase) {
  switch (serverPhase) {
    case 'Lobby':
      return 'lobby'
    case 'DayDiscussion':
      return 'day'
    case 'NightActions':
      return 'night'
    case 'FinalVoting':
      return 'vote'
    case 'Ended':
      return 'ended'
    default:
      return 'day'
  }
}

export function initials(nick = '') {
  const safe = String(nick ?? '').trim()
  const words = safe.split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1
      ? words.slice(0, 2).map((w) => Array.from(w)[0])
      : Array.from(words[0] ?? '?').slice(0, 2)
  return letters.join('').toUpperCase()
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const buildEmptyTraits = (open = {}) =>
  Object.fromEntries(
    TRAIT_CATEGORIES.map(({ key }) => [
      key,
      open[key] ? { revealed: true, ...open[key] } : { revealed: false },
    ])
  )

// Gracz z lobby / backendu → gracz w widoku gry TV
export const createPlayer = (lobbyPlayer) => {
  const nick = lobbyPlayer?.nickname ?? lobbyPlayer?.nick ?? 'Gracz'
  return {
    id: lobbyPlayer.id,
    nick,
    nickname: nick,
    isOnline: lobbyPlayer.isOnline ?? true,
    isReady: lobbyPlayer.isReady ?? true,
    status: lobbyPlayer.status ?? 'aktywny',
    muted: Boolean(lobbyPlayer.isSilenced ?? lobbyPlayer.muted),
    lastRevealed: null,
    traits: buildEmptyTraits(),
  }
}

export const MOCK_GAME = {
  room: { code: '....', qrCodeBase64: null, joinUrl: '' },
  day: 1,
  totalDays: 5,
  daysProgress: [],
  dayProgressPercent: 0,
  topic: 'Publiczna debata o przydatności',
  settings: {
    dayMinutes: 5,
    nightSeconds: 60,
    voteSeconds: 45,
    days: 5,
    maxPlayers: 8,
    revealOrder: 'random',
    sound: true,
  },
  disaster: {
    name: 'Echo Zero',
    description:
      'Skażony pył pokrył powierzchnię. Powietrze na zewnątrz jest toksyczne, a łączność z innymi schronami nie działa.',
    threat: 4,
    threatMax: 5,
    threatLabel: 'Wysokie',
  },
  bunker: {
    seats: 5,
    stay: '12 miesięcy',
    systems: [
      { name: 'Filtracja powietrza', state: 'sprawny' },
      { name: 'Generator', state: 'ograniczony' },
      { name: 'Zapas wody', state: 'krytyczny' },
    ],
    rooms: ['Ambulatorium', 'Warsztat', 'Magazyn żywności'],
  },
  lobbyPlayers: [],
  players: [],
  debate: { speakerId: null, spoken: [] },
  timer: { total: 300, remaining: 300, running: false, paused: false },
  events: [],
  connStatus: 'connecting',
  startError: '',
  startingGame: false,
}
