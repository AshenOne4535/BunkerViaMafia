import { useId, useMemo, useState } from 'react'
import logo from '../assets/bunker-logo.png'
import './HostLobby.css'

// ---------------------------------------------------------------------------
// Stałe i dane startowe
// ---------------------------------------------------------------------------

const MIN_PLAYERS_TO_START = 3
const SLOT_COUNT = 8

const DEFAULT_SETTINGS = {
  dayMinutes: 5,
  nightSeconds: 60,
  voteSeconds: 45,
  days: 5,
  maxPlayers: SLOT_COUNT,
  revealOrder: 'random',
  sound: true,
}

// Pola liczbowe panelu "USTAWIENIA GRY" (zakresy z makiety)
const STEPPERS = [
  { name: 'dayMinutes', label: 'DŁUGOŚĆ DNIA', unit: 'MIN', min: 1, max: 10, step: 1 },
  { name: 'nightSeconds', label: 'DŁUGOŚĆ NOCY', unit: 'S', min: 30, max: 120, step: 5 },
  { name: 'voteSeconds', label: 'CZAS GŁOSOWANIA FINAŁOWEGO', unit: 'S', min: 30, max: 120, step: 5 },
  { name: 'days', label: 'LICZBA DNI', unit: 'DNI', min: 1, max: 10, step: 1 },
  { name: 'maxPlayers', label: 'MAX. GRACZY', unit: 'GRACZY', min: MIN_PLAYERS_TO_START, max: SLOT_COUNT, step: 1 },
]

const REVEAL_OPTIONS = [
  { value: 'random', label: 'LOSOWA' },
  { value: 'manual', label: 'RĘCZNA' },
]

const SOUND_OPTIONS = [
  { value: true, label: 'WŁĄCZONY' },
  { value: false, label: 'WYŁĄCZONY' },
]

const DEFAULT_NAV = [
  { id: 'broadcast', label: 'TRANSMISJA LOKALNA', href: '#', live: true },
  { id: 'host', label: 'PANEL HOSTA', href: '#', current: true },
]

const CONNECTION = {
  stable: { label: 'POŁĄCZENIE STABILNE', tone: 'ok' },
  connecting: { label: 'ŁĄCZENIE…', tone: 'wait' },
  lost: { label: 'BRAK POŁĄCZENIA', tone: 'bad' },
}

// TODO (SignalR, Task 10): lista graczy przyjdzie z serwera przez props `players`.
// signal: 0 = offline, 1-4 = siła sygnału.
const DEMO_PLAYERS = [
  { id: 'p1', nickname: 'Szczur', isReady: true, isOnline: true },
  { id: 'p2', nickname: 'Doktor Kot', isReady: true, isOnline: true },
  { id: 'p3', nickname: 'Marek', isReady: true, isOnline: true },
  { id: 'p4', nickname: 'Nika', isReady: true, isOnline: true },
  { id: 'p5', nickname: 'Wilk', isReady: true, isOnline: true },
]
// ---------------------------------------------------------------------------
// Funkcje pomocnicze
// ---------------------------------------------------------------------------

// "Doktor Kot" -> "DK", "Szczur" -> "SZ"
function getInitials(nick) {
  const words = nick.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1
      ? words.slice(0, 2).map((w) => Array.from(w)[0])
      : Array.from(words[0] ?? '?').slice(0, 2)
  return letters.join('').toUpperCase()
}

function getLobbyStatus(players) {
  const missing = MIN_PLAYERS_TO_START - players.length
  if (missing > 0) {
    return {
      tone: 'wait',
      title: `ZA MAŁO GRACZY: BRAKUJE ${missing}`,
      hint: `DO STARTU POTRZEBNE MIN. ${MIN_PLAYERS_TO_START} GRACZY.`,
    }
  }
  const waiting = players.filter((p) => p.isOnline && !p.isReady).length
  if (waiting > 0) {
    return {
      tone: 'wait',
      title: `OCZEKIWANIE NA GOTOWOŚĆ: ${waiting}`,
      hint: 'MOŻESZ ZACZĄĆ TERAZ LUB POCZEKAĆ NA POZOSTAŁYCH.',
    }
  }
  return {
    tone: 'ok',
    title: 'WSZYSCY POŁĄCZENI GRACZE SĄ GOTOWI',
    hint: 'MOŻESZ ZACZĄĆ LUB POCZEKAĆ NA KOLEJNYCH OCALAŁYCH.',
  }
}

// ---------------------------------------------------------------------------
// Placeholder kodu QR
// Prawdziwy kod wygeneruje serwer (Task 7), a ekran dostanie go w props `qrSrc`.
// Do tego czasu rysujemy wzór: 3 znaczniki narożne + moduły zależne od kodu pokoju.
// ---------------------------------------------------------------------------

const QR_SIZE = 21
const FINDER_ORIGINS = [
  [0, 0],
  [QR_SIZE - 7, 0],
  [0, QR_SIZE - 7],
]

// true/false = moduł znacznika (lub odstęp wokół niego), null = moduł danych
function finderModule(x, y) {
  for (const [ox, oy] of FINDER_ORIGINS) {
    const lx = x - ox
    const ly = y - oy
    if (lx >= 0 && lx < 7 && ly >= 0 && ly < 7) {
      const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6
      const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4
      return ring || core
    }
    if (lx >= -1 && lx <= 7 && ly >= -1 && ly <= 7) return false
  }
  return null
}

function buildQrPath(seed) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  h = h || 1
  const next = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }

  let d = ''
  for (let y = 0; y < QR_SIZE; y++) {
    for (let x = 0; x < QR_SIZE; x++) {
      let dark = finderModule(x, y)
      if (dark === null) dark = next() > 0.5
      if (dark) d += `M${x} ${y}h1v1h-1z`
    }
  }
  return d
}

function QrPlaceholder({ code }) {
  const path = useMemo(() => buildQrPath(code), [code])
  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Wzór kodu QR (podgląd)"
    >
      <path d={path} fill="currentColor" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Ikony (inline SVG, kolor z currentColor)
// ---------------------------------------------------------------------------

function Icon({ className, children }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

function UserPlusIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <path d="M20 8v6M23 11h-6" />
    </Icon>
  )
}

function LockIcon({ className }) {
  return (
    <Icon className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Icon>
  )
}

function ArrowRightIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  )
}

// ---------------------------------------------------------------------------
// Załoga: sloty
// ---------------------------------------------------------------------------

function SignalBars({ level }) {
  return (
    <span className="signal" role="img" aria-label={`Sygnał: ${level} z 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={`signal__bar${i <= level ? ' signal__bar--on' : ''}`} />
      ))}
    </span>
  )
}

function PlayerSlot({ player }) {
  const online = player.isOnline
  const state = !online ? 'offline' : player.isReady ? 'ready' : 'waiting'
  const statusText = {
    ready: 'READY / GOTOWY',
    waiting: 'NIEGOTOWY',
    offline: 'ROZŁĄCZONY',
  }[state]

  return (
    <li className={`slot slot--filled slot--${state}`}>
      <div className="slot__top">
        <span className="slot__avatar" aria-hidden="true">
          {getInitials(player.nickname)}
        </span>
        <span className="slot__nick" title={player.nickname}>
          {player.nickname}
        </span>
        <SignalBars level={online ? 4 : 0} />
      </div>
      <div className="slot__bottom">
        <span className="slot__status">
          <span className="dot" aria-hidden="true" />
          {statusText}
        </span>
        <span className="slot__net">{online ? 'ONLINE' : 'OFFLINE'}</span>
      </div>
    </li>
  )
}

function EmptySlot() {
  return (
    <li className="slot slot--empty">
      <UserPlusIcon className="slot__icon" />
      <span className="slot__empty-text">
        <span className="slot__empty-title">OCZEKIWANIE</span>
        <span className="slot__empty-sub">NA GRACZA…</span>
      </span>
    </li>
  )
}

function LockedSlot({ limit }) {
  return (
    <li className="slot slot--empty slot--locked">
      <LockIcon className="slot__icon" />
      <span className="slot__empty-text">
        <span className="slot__empty-title">ZABLOKOWANY</span>
        <span className="slot__empty-sub">LIMIT: {limit} GRACZY</span>
      </span>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Panel ustawień: kontrolki
// ---------------------------------------------------------------------------

// Pole liczbowe z przyciskami - / +. Wpisana ręcznie wartość jest
// przycinana do zakresu po opuszczeniu pola (onBlur).
function Stepper({ label, unit, value, min, max, step, rangeText, onChange }) {
  const labelId = useId()
  const [draft, setDraft] = useState(null) // null = nie edytujemy ręcznie

  const clampValue = (n) => Math.min(max, Math.max(min, n))

  const commit = () => {
    if (draft === null) return
    const parsed = Number.parseInt(draft, 10)
    if (!Number.isNaN(parsed)) onChange(clampValue(parsed))
    setDraft(null)
  }

  const bump = (direction) => {
    setDraft(null)
    onChange(clampValue(value + direction * step))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      bump(1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      bump(-1)
    } else if (e.key === 'Enter') {
      commit()
    }
  }

  return (
    <div className="setting">
      <span id={labelId} className="setting__label">
        {label}
      </span>
      <div className="setting__row">
        <span className="setting__readout">
          {value} {unit}
        </span>
        <div className="stepper">
          <button
            type="button"
            className="stepper__btn"
            aria-label={`Zmniejsz: ${label}`}
            onClick={() => bump(-1)}
            disabled={value <= min}
          >
            −
          </button>
          <input
            className="stepper__input"
            type="text"
            inputMode="numeric"
            role="spinbutton"
            aria-labelledby={labelId}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={`${value} ${unit}`}
            value={draft ?? String(value)}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 3))}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="stepper__btn"
            aria-label={`Zwiększ: ${label}`}
            onClick={() => bump(1)}
            disabled={value >= max}
          >
            +
          </button>
        </div>
        <span className="setting__range">{rangeText}</span>
      </div>
    </div>
  )
}

// Wybór jednej z opcji (natywne radio, ostylowane jak przełącznik)
function Segmented({ label, options, value, onChange }) {
  const labelId = useId()
  const groupName = useId()
  const current = options.find((o) => o.value === value)

  return (
    <div className="setting">
      <span id={labelId} className="setting__label">
        {label}
      </span>
      <div className="setting__row setting__row--split">
        <span className="setting__readout">{current?.label}</span>
        <div className="segmented" role="radiogroup" aria-labelledby={labelId}>
          {options.map((opt) => (
            <label key={String(opt.value)} className="segmented__option">
              <input
                type="radio"
                name={groupName}
                value={String(opt.value)}
                checked={opt.value === value}
                onChange={() => onChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ekran
// ---------------------------------------------------------------------------

/**
 * Props (wszystkie opcjonalne, domyślnie dane pokazowe z makiety):
 *  - roomCode          kod pokoju, np. "A7X2"
 *  - players           [{ id, nick, ready, signal }], signal 0 = offline, 1-4 = siła sygnału
 *  - connection        'stable' | 'connecting' | 'lost' (stopka)
 *  - qrSrc             adres obrazka QR z serwera; bez niego rysowany jest wzór
 *  - joinUrl           adres strony gry pokazany pod instrukcją
 *  - navItems          [{ id, label, href, live?, current? }] linki w nagłówku
 *  - headerExtra       dowolny element w nagłówku obok kodu pokoju (np. przełącznik motywu)
 *  - onStart           ({ roomCode, settings, players }) po kliknięciu START GRY
 *  - onSettingsChange  (settings) po każdej zmianie ustawień
 */
export default function HostLobby({
  roomCode = 'A7X2',
  players = DEMO_PLAYERS,
  connection = 'stable',
  qrSrc,
  joinUrl,
  navItems = DEFAULT_NAV,
  headerExtra,
  onStart,
  onSettingsChange,
}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const canStart = players.length >= MIN_PLAYERS_TO_START
  const missing = Math.max(0, MIN_PLAYERS_TO_START - players.length)
  const status = getLobbyStatus(players)
  const conn = CONNECTION[connection] ?? CONNECTION.lost

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    onSettingsChange?.(next)
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    onSettingsChange?.(DEFAULT_SETTINGS)
  }

  const handleStart = () => {
    if (!canStart) return
    onStart?.({ roomCode, settings, players })
  }

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const player = players[i]
    if (player) return <PlayerSlot key={player.id} player={player} />
    if (i >= settings.maxPlayers) return <LockedSlot key={`locked-${i}`} limit={settings.maxPlayers} />
    return <EmptySlot key={`empty-${i}`} />
  })

  return (
    <div className="host">
      {/* ---------- Nagłówek ---------- */}
      <header className="host-header">
        <div className="host-brand">
          <img className="host-brand__logo" src={logo} alt="" />
          <div className="host-brand__text">
            <span className="host-brand__name">BUNKIER</span>
            <span className="host-brand__tagline">UKRYTE ZAGROŻENIE</span>
          </div>
        </div>

        <nav className="host-nav" aria-label="Nawigacja hosta">
          {navItems.map((item) => (
            <a
              key={item.id}
              className="host-nav__item"
              href={item.href ?? '#'}
              aria-current={item.current ? 'page' : undefined}
            >
              {item.live && <span className="dot dot--ok" aria-hidden="true" />}
              {item.label}
            </a>
          ))}
        </nav>

        <div className="host-header__right">
          {headerExtra}
          <div className="host-roomtag">
            <span className="host-roomtag__label">KOD POKOJU</span>
            <span className="host-roomtag__code">{roomCode}</span>
          </div>
        </div>
      </header>

      <main className="host-main">
        {/* ---------- Lewa część ---------- */}
        <section className="host-stage" aria-labelledby="host-title">
          <div className="host-titlebar">
            <div>
              <p className="host-eyebrow">SYSTEM B-07 / POKÓJ OTWARTY</p>
              <h1 id="host-title" className="host-title">
                ZBIÓRKA OCALAŁYCH
              </h1>
            </div>
            <p className="host-step">01 / OCZEKIWANIE NA ZAŁOGĘ</p>
          </div>

          <div className="host-code">
            <div className="host-code__head">
              <span className="host-code__label">KOD DOSTĘPU DO POKOJU</span>
              <span className="dot dot--ok" aria-hidden="true" />
            </div>

            <p className="host-code__value">{roomCode}</p>

            <div className="host-code__join">
              <figure className="qr">
                <div className="qr__box">
                  {qrSrc ? (
                    <img src={qrSrc} alt={`Kod QR do pokoju ${roomCode}`} />
                  ) : (
                    <QrPlaceholder code={roomCode} />
                  )}
                </div>
                <figcaption className="qr__caption">{qrSrc ? 'QR' : 'QR / WZÓR'}</figcaption>
              </figure>
              <div className="host-code__howto">
                <p className="host-code__howto-main">WEJDŹ NA STRONĘ GRY I WPISZ KOD</p>
                <p className="host-code__howto-sub">NA TELEFONIE • BEZ REJESTRACJI</p>
                {joinUrl && <p className="host-code__url">{joinUrl}</p>}
              </div>
            </div>
          </div>

          <div className="host-crew">
            <div className="host-crew__head">
              <h2 className="host-crew__title">ZAŁOGA</h2>
              <p className="host-crew__count">
                {players.length} / {settings.maxPlayers} GRACZY
              </p>
            </div>
            <ul className="host-slots">{slots}</ul>
          </div>

          <div className={`host-status host-status--${status.tone}`} role="status">
            <p className="host-status__main">
              <span className="dot" aria-hidden="true" />
              {status.title}
            </p>
            <p className="host-status__sub">{status.hint}</p>
          </div>
        </section>

        {/* ---------- Prawa część: ustawienia ---------- */}
        <aside className="host-settings" aria-labelledby="host-settings-title">
          <p className="host-eyebrow">KONFIGURACJA</p>
          <h2 id="host-settings-title" className="host-settings__title">
            USTAWIENIA GRY
          </h2>
          <p className="host-settings__lead">
            MINIMALNA LICZBA GRACZY: {MIN_PLAYERS_TO_START}. WSZYSTKIE USTAWIENIA SĄ WIDOCZNE DLA HOSTA.
          </p>

          {STEPPERS.map((cfg) => (
            <Stepper
              key={cfg.name}
              label={cfg.label}
              unit={cfg.unit}
              step={cfg.step}
              max={cfg.max}
              // limit graczy nie może spaść poniżej liczby graczy już w pokoju
              min={cfg.name === 'maxPlayers' ? Math.max(cfg.min, players.length) : cfg.min}
              rangeText={`${cfg.min}–${cfg.max} ${cfg.unit}`}
              value={settings[cfg.name]}
              onChange={(v) => updateSettings({ [cfg.name]: v })}
            />
          ))}

          <Segmented
            label="KOLEJNOŚĆ ODKRYĆ"
            options={REVEAL_OPTIONS}
            value={settings.revealOrder}
            onChange={(v) => updateSettings({ revealOrder: v })}
          />
          <Segmented
            label="DŹWIĘK"
            options={SOUND_OPTIONS}
            value={settings.sound}
            onChange={(v) => updateSettings({ sound: v })}
          />

          <div className="setting setting--reset">
            <span className="setting__label">WARTOŚCI DOMYŚLNE</span>
            <button type="button" className="ghost-btn" onClick={resetSettings}>
              PRZYWRÓĆ DOMYŚLNE
            </button>
          </div>

          <div className="host-start">
            <div className="start-info" id="host-start-hint">
              <div>
                <p className="start-info__label">STATUS STARTU</p>
                <p className="start-info__value">MIN. {MIN_PLAYERS_TO_START} GRACZY</p>
              </div>
              <span className={`start-info__badge${canStart ? ' start-info__badge--ok' : ''}`}>
                {canStart ? 'GOTOWE' : `BRAKUJE ${missing}`}
              </span>
            </div>

            <button
              type="button"
              className="start-btn"
              onClick={handleStart}
              disabled={!canStart}
              aria-describedby="host-start-hint"
            >
              START GRY
              <ArrowRightIcon className="start-btn__icon" />
            </button>
          </div>
        </aside>
      </main>

      {/* ---------- Stopka ---------- */}
      <footer className="host-footer">
        <span>B-07 / PROTOKÓŁ PRZETRWANIA</span>
        <span className="host-footer__tags">LOBBY • TELEFONY = TAJNE KONTROLERY</span>
        <span className={`host-footer__conn host-footer__conn--${conn.tone}`}>
          <span className="dot" aria-hidden="true" />
          {conn.label}
        </span>
      </footer>
    </div>
  )
}
