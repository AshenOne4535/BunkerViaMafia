import { useEffect, useState } from 'react'
import { getMyCard } from '../api/myCard'
import './YourCard.css'

// Role z backendu (SecretRole) -> tekst na banerze.
const ROLES = {
  Survivor: { label: 'OCALAŁY' },
  Traitor: { label: 'ZDRAJCA' },
  Doctor: { label: 'LEKARZ' },
  Scientist: { label: 'NAUKOWIEC' },
}

// Fazy gry (GamePhase) -> podpis pod paskiem górnym.
const PHASES = {
  Lobby: { label: 'POCZEKALNIA', night: false },
  DayDiscussion: { label: 'FAZA DNIA: DYSKUSJA', night: false },
  NightActions: { label: 'FAZA NOCY', night: true },
  FinalVoting: { label: 'GŁOSOWANIE KOŃCOWE', night: false },
  Ended: { label: 'KONIEC GRY', night: false },
}

// Kategorie kart (TraitCategory) -> podpis i ikona; kolejność = kolejność siatki.
const TRAITS = {
  Profession: { label: 'ZAWÓD', icon: 'wrench' },
  Health: { label: 'ZDROWIE', icon: 'heart' },
  Phobia: { label: 'FOBIA', icon: 'bug' },
  Hobby: { label: 'HOBBY', icon: 'gamepad' },
  Equipment: { label: 'EKWIPUNEK', icon: 'backpack' },
  AgeAndGender: { label: 'WIEK I PŁEĆ', icon: 'user' },
}

const ICON_PATHS = {
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  heart: (
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  ),
  bug: (
    <>
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </>
  ),
  gamepad: (
    <>
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </>
  ),
  backpack: (
    <>
      <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5" />
      <path d="M8 10h8" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
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

function TraitTile({ trait }) {
  const meta = TRAITS[trait.category]
  const known = trait.isRevealed

  return (
    <li className={`ycard__tile${known ? ' ycard__tile--known' : ''}`}>
      <div className="ycard__tile-top">
        <span className="ycard__tile-icon">
          <Icon name={meta.icon} size={22} />
        </span>
        <span className="ycard__tile-eye">
          {known && <span className="ycard__tile-dot" aria-hidden="true" />}
          <Icon name={known ? 'eye' : 'eye-off'} size={16} />
          <span className="sr-only">{known ? 'Znana wszystkim' : 'Ukryta przed innymi'}</span>
        </span>
      </div>
      <div>
        <p className="ycard__tile-label">{meta.label}</p>
        <p className="ycard__tile-value">{trait.value}</p>
      </div>
    </li>
  )
}

export default function YourCard({ roomCode }) {
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    getMyCard()
      .then((data) => {
        if (cancelled) return
        setCard(data)
        setError('')
      })
      .catch(() => {
        if (cancelled) return
        setError('Nie udało się pobrać Twojej karty.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setLoading(true)
    setError('')
    setAttempt((n) => n + 1)
  }

  if (loading) {
    return (
      <main className="ycard ycard--center">
        <p className="ycard__status" role="status">
          ŁADOWANIE KARTY…
        </p>
      </main>
    )
  }

  if (error || !card) {
    return (
      <main className="ycard ycard--center">
        <p className="ycard__status ycard__status--error" role="alert">
          {error || 'Brak danych karty.'}
        </p>
        <button type="button" className="ycard__retry" onClick={retry}>
          SPRÓBUJ PONOWNIE
        </button>
      </main>
    )
  }

  const role = ROLES[card.role] ?? { label: 'BRAK ROLI' }
  const phase = PHASES[card.phase] ?? PHASES.Lobby
  const known = card.traits.filter((t) => t.isRevealed).length

  return (
    <main className="ycard">
      <header className="ycard__top">
        <div className="ycard__day">
          <Icon name={phase.night ? 'moon' : 'sun'} size={18} />
          {phase.night ? 'NOC' : 'DZIEŃ'} {card.day}
        </div>
        {/* TODO: licznik ma przychodzić z serwera (SignalR); na razie wartość statyczna */}
        <div className="ycard__timer">
          <span className="ycard__timer-time">{card.timeLeft}</span>
          <Icon name="clock" size={20} />
        </div>
      </header>

      <div className="ycard__phase">
        <span>{phase.label}</span>
        <span className="ycard__phase-code">{roomCode ?? card.roomCode}</span>
      </div>

      <section className="ycard__role" aria-label="Twoja rola">
        <span className="ycard__role-icon">
          <Icon name="eye-off" size={26} />
        </span>
        <div className="ycard__role-text">
          <p className="ycard__role-kicker">TWOJA ROLA</p>
          <p className="ycard__role-name">{role.label}</p>
          <p className="ycard__role-hint">Nikomu nie pokazuj tego ekranu.</p>
        </div>
      </section>

      <section className="ycard__traits" aria-labelledby="ycard-traits-title">
        <div className="ycard__traits-head">
          <h2 id="ycard-traits-title" className="ycard__traits-title">
            TWOJA KARTA
          </h2>
          <span className="ycard__traits-count">
            ZNANE: {known} / {card.traits.length}
          </span>
        </div>

        <ul className="ycard__grid">
          {card.traits.map((trait) => (
            <TraitTile key={trait.category} trait={trait} />
          ))}
        </ul>

        <p className="ycard__note">
          <Icon name="eye-off" size={14} />
          Ukryte cechy widzisz tylko ty.
        </p>
      </section>
    </main>
  )
}
