
import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { getLobby } from '../api/lobby'
import './Waiting.css'

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

// "Doktor Kot" -> "DK", "Szczur" -> "SZ"
function getInitials(nick) {
  const words = nick.trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length > 1
      ? words.slice(0, 2).map((w) => Array.from(w)[0])
      : Array.from(words[0] ?? '?').slice(0, 2)
  return letters.join('').toUpperCase()
}

const pad = (n) => String(n).padStart(2, '0')

const ICON_PATHS = {
  radar: (
    <>
      <path d="M5 12a7 7 0 0 1 7-7" />
      <path d="M2 12a10 10 0 0 1 10-10" />
      <path d="M8 12a4 4 0 0 1 4-4" />
      <circle cx="12" cy="12" r="1.5" />
      <path d="M12 12l6 6" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6 2h12M6 22h12" />
      <path d="M7 2v4a5 5 0 0 0 2 4l3 2-3 2a5 5 0 0 0-2 4v4" />
      <path d="M17 2v4a5 5 0 0 1-2 4l-3 2 3 2a5 5 0 0 1 2 4v4" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  signal: <path d="M4 20v-4M10 20v-8M16 20V8M22 20V4" />,
}

function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name]}
    </svg>
  )
}

// В функции Waiting (строки 56-83):
export default function Waiting({ roomCode, nick, playerId, onGameStart }) {
  const [lobby, setLobby] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let connection = null

    getLobby({ roomCode, nick })
      .then((data) => {
        if (cancelled) return
        setLobby(data)
        setError('')
      })
      .catch(() => {
        if (cancelled) return
        setError('Nie udało się pobrać listy graczy.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    if (roomCode) {
      connection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_URL}/hubs/game`)
        .withAutomaticReconnect()
        .build()

      // 1. Когда заходит новый игрок — добавляем его в список на телефоне
      connection.on('PlayerJoined', (newPlayer) => {
        if (cancelled) return
        setLobby((prev) => {
          if (!prev) return prev
          if (prev.players.some((p) => p.id === newPlayer.id)) return prev
          return {
            ...prev,
            players: [
              ...prev.players,
              {
                id: newPlayer.id,
                nickname: newPlayer.nickname,
                isReady: newPlayer.isReady,
                isMe: newPlayer.nickname.toLowerCase() === nick.trim().toLowerCase(),
              },
            ],
          }
        })
      })

      // 2. Когда Хост нажал START GRY — переключаем телефон на экран YourCard!
      connection.on('RolesAssigned', () => {
        if (!cancelled) {
          onGameStart?.()
        }
      })

      connection
        .start()
        .then(() => {
          if (playerId) {
            return connection.invoke('RegisterPlayerConnection', roomCode, playerId)
          }
          return connection.invoke('JoinRoomGroup', roomCode)
        })
        .catch((err) => console.error('SignalR waiting error:', err))
    }

    return () => {
      cancelled = true
      if (connection) connection.stop()
    }
  }, [roomCode, nick, playerId, onGameStart, attempt])

  const retry = () => {
    setLoading(true)
    setError('')
    setAttempt((n) => n + 1)
  }

  if (loading) {
    return (
      <main className="wait wait--center">
        <p className="wait__status" role="status">
          ŁĄCZENIE Z POKOJEM…
        </p>
      </main>
    )
  }

  if (error || !lobby) {
    return (
      <main className="wait wait--center">
        <p className="wait__status wait__status--error" role="alert">
          {error || 'Brak danych pokoju.'}
        </p>
        <button type="button" className="wait__retry" onClick={retry}>
          SPRÓBUJ PONOWNIE
        </button>
      </main>
    )
  }

  const { players, maxPlayers } = lobby
  const emptySlots = Math.min(1, Math.max(0, maxPlayers - players.length))
  const percent = Math.min(100, Math.round((players.length / maxPlayers) * 100))

  return (
    <main className="wait">
      <header className="wait__top">
        <div>
          <h1 className="wait__logo">BUNKIER</h1>
          <p className="wait__tagline">UKRYTE ZAGROŻENIE</p>
        </div>
        <div className="wait__room">
          <span className="wait__room-label">POKÓJ</span>
          <span className="wait__room-code">
            {roomCode}
            <Icon name="signal" size={14} />
          </span>
        </div>
      </header>

      <section className="wait__panel" aria-live="polite">
        <div className="wait__panel-head">
          <span className="wait__radar">
            <Icon name="radar" size={26} />
            <span className="wait__radar-dot" aria-hidden="true" />
          </span>
          <div>
            <h2 className="wait__title">POŁĄCZONO!</h2>
            <p className="wait__text">Czekamy na pozostałych graczy…</p>
          </div>
        </div>
        <hr className="wait__divider" />
        <p className="wait__host">
          <Icon name="hourglass" size={16} />
          Gospodarz wkrótce wystartuje grę.
        </p>
      </section>

      <section className="wait__players" aria-labelledby="wait-players-title">
        <div className="wait__players-head">
          <h2 id="wait-players-title" className="wait__players-title">
            GRACZE W POKOJU
          </h2>
          <span className="wait__players-count">
            {players.length} / {maxPlayers}
          </span>
        </div>
        <div
          className="wait__bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={maxPlayers}
          aria-valuenow={players.length}
          aria-label="Zapełnienie pokoju"
        >
          <span className="wait__bar-fill" style={{ width: `${percent}%` }} />
        </div>

        <ul className="wait__list">
          {players.map((p, i) => (
            <li key={p.id} className={`wait__row${p.isMe ? ' wait__row--me' : ''}`}>
              <span className="wait__avatar">{getInitials(p.nickname)}</span>
              <span className="wait__who">
                <span className="wait__name">
                  {p.nickname}
                  {p.isMe && <span className="wait__badge">TY</span>}
                </span>
                <span className="wait__num">GRACZ {pad(i + 1)}</span>
              </span>
              <span className={`wait__state${p.isReady ? '' : ' wait__state--idle'}`}>
                <span className="wait__state-dot" aria-hidden="true" />
                {p.isReady ? 'GOTOWY' : 'ŁĄCZY SIĘ'}
              </span>
            </li>
          ))}
          {Array.from({ length: emptySlots }, (_, i) => (
            <li key={`empty-${i}`} className="wait__row wait__row--empty">
              Oczekiwanie na gracza…
            </li>
          ))}
        </ul>
      </section>

      <div className="wait__footer">
        <button type="button" className="wait__start" disabled>
          <Icon name="lock" size={16} />
          CZEKAJ NA START OD GOSPODARZA
        </button>
      </div>
    </main>
  )
}
