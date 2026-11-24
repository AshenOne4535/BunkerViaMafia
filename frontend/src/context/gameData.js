// Kategorie kart cech: zgodnie z backlogiem (Task 5, 6 kategorii) i makietą TV.
// Chcesz inne? Zmień tylko tę tablicę (np. dodaj { key: 'karta', label: 'Karta Specjalna', short: 'KARTA SPEC.' }).
export const TRAIT_CATEGORIES = [
  { key: 'zawod', label: 'Zawód', short: 'ZAWÓD' },
  { key: 'fobia', label: 'Fobia', short: 'FOBIA' },
  { key: 'zdrowie', label: 'Zdrowie', short: 'ZDROWIE' },
  { key: 'hobby', label: 'Hobby', short: 'HOBBY' },
  { key: 'ekwipunek', label: 'Ekwipunek', short: 'EKWI.' },
  { key: 'wiekPlec', label: 'Wiek i płeć', short: 'WIEK I PŁEĆ' },
]


export function initials(nick = '') {
  const words = nick.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1
      ? words.slice(0, 2).map((w) => Array.from(w)[0])
      : Array.from(words[0] ?? '?').slice(0, 2)
  return letters.join('').toUpperCase()
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}


const traits = (open = {}) =>
  Object.fromEntries(
    TRAIT_CATEGORIES.map(({ key }) => [
      key,
      open[key] ? { revealed: true, ...open[key] } : { revealed: false },
    ]),
  )

// Gracz z lobby → gracz w grze (wszystkie karty zakryte)
export const createPlayer = (lobbyPlayer) => ({
  id: lobbyPlayer.id,
  nick: lobbyPlayer.nick,
  status: 'aktywny',
  muted: false,
  lastRevealed: null,
  traits: traits(),
})


export const MOCK_GAME = {
  room: { code: 'A7X2' },
  day: 2,
  totalDays: 5,
  topic: 'Publiczna debata o przydatności',
  settings: { nightSeconds: 60 },
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
  players: [
    {
      id: 'p1', nick: 'Nika', status: 'aktywny', muted: false, lastRevealed: 'zawod',
      traits: traits({ zawod: { value: 'Lekarka', note: 'Medycyna ratunkowa' } }),
    },
    {
      id: 'p2', nick: 'Wilk', status: 'aktywny', muted: false, lastRevealed: 'zawod',
      traits: traits({ zawod: { value: 'Inżynier', note: 'Systemy wentylacji' } }),
    },
    {
      id: 'p3', nick: 'Szczur', status: 'aktywny', muted: false, lastRevealed: 'fobia',
      traits: traits({ fobia: { value: 'Arachnofobia', note: 'Paniczny lęk przed pająkami' } }),
    },
    {
      id: 'p4', nick: 'Doktor Kot', status: 'aktywny', muted: false, lastRevealed: 'zdrowie',
      traits: traits({ zdrowie: { value: 'Choroba afektywna dwubiegunowa' } }),
    },
    {
      id: 'p5', nick: 'Marek', status: 'aktywny', muted: true, lastRevealed: 'zawod',
      traits: traits({ zawod: { value: 'Radiooperator' } }),
    },
    
    {
      id: 'p6', nick: 'Ola', status: 'wygnany', muted: false, lastRevealed: 'zawod',
      traits: traits({ zawod: { value: 'Kucharka' }, zdrowie: { value: 'Zdrowa' } }),
    },
  ],
  debate: { speakerId: 'p1', spoken: [] },
  timer: { total: 300, remaining: 165, running: false },
  events: [
    { id: 'e1', time: '02:45', type: 'Nowy dzień', text: 'Rozpoczął się dzień 2. Wszyscy gracze wrócili do dyskusji.' },
    { id: 'e2', time: '02:42', type: 'Sabotaż', text: 'Marek został pozbawiony głosu po nocnym sabotażu.' },
    { id: 'e3', time: '02:38', type: 'Ujawnienie', text: 'Nika ujawniła zawód: Lekarka.' },
    { id: 'e4', time: '02:30', type: 'Debata', text: 'Gracze zaczynają dyskutować o przydatności zawodów w bunkrze.' },
  ],
}