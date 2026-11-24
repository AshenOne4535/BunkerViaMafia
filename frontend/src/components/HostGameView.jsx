import logo from '../assets/bunker-logo.png'
import { useGame } from '../context/GameContext.jsx'
import { formatTime } from '../context/gameData.js'
import MainBoard from './MainBoard.jsx'
import AllPlayers from './AllPlayers.jsx'
import './HostLobby.css' // wspólne z lobby: tło, nagłówek, stopka, skalowanie (.host*)
import './HostGameView.css'

const DEFAULT_NAV = [
  { id: 'broadcast', label: 'TRANSMISJA LOKALNA', href: '#', live: true },
  { id: 'host', label: 'PANEL HOSTA', href: '#', current: true },
]

const CONNECTION = {
  stable: { label: 'POŁĄCZENIE STABILNE', tone: 'ok' },
  connecting: { label: 'ŁĄCZENIE…', tone: 'wait' },
  lost: { label: 'BRAK POŁĄCZENIA', tone: 'bad' },
}

const PHASE_COPY = {
  day: { eyebrow: 'Faza dnia: dyskusja', label: 'Dyskusja' },
  night: { eyebrow: 'Faza nocy', title: 'Tajne akcje na telefonach', label: 'Noc' },
  vote: { eyebrow: 'Rada końcowa', title: 'Głosowanie: kto wchodzi do bunkra', label: 'Głosowanie' },
}

function TimerCard() {
  const { timer } = useGame()
  const { remaining, total } = timer
  const state = remaining === 0 ? 'is-expired' : remaining <= 10 ? 'is-danger' : remaining <= 30 ? 'is-warning' : ''
  const pct = total > 0 ? (remaining / total) * 100 : 0

  return (
    <div className={`hg-timer ${state}`} role="timer" aria-label="Czas dyskusji">
      <div className="hg-timer__row">
        <span>{remaining === 0 ? 'Czas minął' : 'Czas dyskusji'}</span>
        <span>{Math.floor(total / 60)}:{String(total % 60).padStart(2, '0')}</span>
      </div>
      <div className="hg-timer__time">{formatTime(remaining)}</div>
      <div className="hg-timer__bar">
        <div className="hg-timer__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function DayTabs() {
  const { phase, day, totalDays } = useGame()
  const current = phase === 'vote' ? totalDays : day - 1
  const tabs = [...Array.from({ length: totalDays }, (_, i) => `Dzień ${i + 1}`), 'Finał']

  return (
    <nav className="hg-days" style={{ '--tabs': tabs.length }} aria-label="Postęp gry">
      {tabs.map((label, i) => (
        <span
          key={label}
          className={`hg-day${i < current ? ' is-done' : ''}${i === current ? ' is-current' : ''}`}
          aria-current={i === current ? 'step' : undefined}
        >
          {label}
        </span>
      ))}
    </nav>
  )
}

/**
 * Props (opcjonalne, jak w HostLobby):
 *  - navItems     linki w nagłówku
 *  - headerExtra  element obok kodu pokoju (np. przełącznik motywu)
 *  - connection   'stable' | 'connecting' | 'lost'
 */
export default function HostGameView({ navItems = DEFAULT_NAV, headerExtra, connection = 'stable' }) {
  const { phase, day, totalDays, room, topic, timer, settings, setPhase, startNight, startVoting } = useGame()
  const copy = PHASE_COPY[phase] ?? PHASE_COPY.day
  const conn = CONNECTION[connection] ?? CONNECTION.lost
  const isDay = phase === 'day'
  const lastDay = day >= totalDays
  const debateState = timer.remaining === 0 ? 'zakończona' : timer.running ? 'trwa' : 'wstrzymana'

  return (
    <div className="host host-game">
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
            <span className="host-roomtag__code">{room.code}</span>
          </div>
        </div>
      </header>

      <section className="hg-hero">
        <div>
          <p className="hg-hero__eyebrow">{isDay ? `Dzień ${day} — ${copy.eyebrow}` : copy.eyebrow}</p>
          <h1 className="hg-hero__title">{isDay ? topic : copy.title}</h1>
        </div>
        {isDay && <TimerCard />}
      </section>

      <DayTabs />

      <main className="hg-body">
        {isDay ? (
          <>
            <MainBoard />
            <AllPlayers />
          </>
        ) : (
          <div className="hg-placeholder">
            <p>Ekran fazy „{copy.label}” jest w przygotowaniu.</p>
            <button type="button" className="hg-ghost" onClick={() => setPhase('day')}>
              ← Wróć do fazy dnia (tryb testowy)
            </button>
          </div>
        )}
      </main>

      {isDay && (
        <div className="hg-bottom">
          <div>
            <p className="hg-bottom__title">Dzień {day} • Debata {debateState}</p>
            <p className="hg-bottom__hint">
              {lastDay
                ? 'Następna faza: rada końcowa • głosowanie na telefonach'
                : `Następna faza: noc • ${formatTime(settings.nightSeconds)} • tajne akcje na telefonach`}
            </p>
          </div>
          <button type="button" className="hg-cta" onClick={lastDay ? startVoting : startNight}>
            {lastDay ? 'Rozpocznij głosowanie' : 'Rozpocznij noc'} <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      <footer className="host-footer">
        <span>B-07 / PROTOKÓŁ PRZETRWANIA</span>
        <span className="host-footer__tags">
          DZIEŃ {day} / {copy.label.toUpperCase()} • TELEFONY = TAJNE KONTROLERY
        </span>
        <span className={`host-footer__conn host-footer__conn--${conn.tone}`}>
          <span className="dot" aria-hidden="true" />
          {conn.label}
        </span>
      </footer>
    </div>
  )
}