import logo from '../assets/bunker-logo.png'
import { useGame } from '../context/GameContext.jsx'
import { formatTime } from '../context/gameData.js'
import MainBoard from './MainBoard.jsx'
import AllPlayers from './AllPlayers.jsx'
import './HostLobby.css'
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
  ended: { eyebrow: 'Koniec protokołu', title: 'Bunkier został zamknięty', label: 'Koniec gry' },
}

function TimerCard() {
  const { phase, timer } = useGame()
  const { remaining, total } = timer
  const state =
    remaining === 0
      ? 'is-expired'
      : remaining <= 10
        ? 'is-danger'
        : remaining <= 30
          ? 'is-warning'
          : ''
  const pct = total > 0 ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 0
  const label =
    remaining === 0
      ? 'Czas minął'
      : phase === 'vote'
        ? 'Czas głosowania'
        : 'Czas dyskusji'

  return (
    <div className={`hg-timer ${state}`} role="timer" aria-label={label}>
      <div className="hg-timer__row">
        <span>{label}</span>
        <span>{formatTime(total)}</span>
      </div>
      <div className="hg-timer__time">{formatTime(remaining)}</div>
      <div className="hg-timer__bar">
        <div className="hg-timer__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Task 20: Pasek postępu dni zasilany stanem z serwera
function DayTabs() {
  const { phase, day, totalDays, daysProgress } = useGame()
  const isFinal = phase === 'vote' || phase === 'ended'

  const dayItems =
    Array.isArray(daysProgress) && daysProgress.length === totalDays
      ? daysProgress.map((d) => ({
          label: `Dzień ${d.dayNumber}`,
          isDone: isFinal || d.status === 'completed',
          isCurrent: !isFinal && d.status === 'current',
        }))
      : Array.from({ length: totalDays }, (_, i) => ({
          label: `Dzień ${i + 1}`,
          isDone: isFinal || i + 1 < day,
          isCurrent: !isFinal && i + 1 === day,
        }))

  const tabs = [
    ...dayItems,
    {
      label: 'Finał',
      isDone: phase === 'ended',
      isCurrent: phase === 'vote',
    },
  ]

  return (
    <nav className="hg-days" style={{ '--tabs': tabs.length }} aria-label="Pasek postępu dni">
      {tabs.map((tab) => (
        <span
          key={tab.label}
          className={`hg-day${tab.isDone ? ' is-done' : ''}${tab.isCurrent ? ' is-current' : ''}`}
          aria-current={tab.isCurrent ? 'step' : undefined}
        >
          {tab.label}
        </span>
      ))}
    </nav>
  )
}

export default function HostGameView({ navItems = DEFAULT_NAV, headerExtra, connection = 'stable' }) {
  const {
    phase,
    day,
    totalDays,
    room,
    topic,
    timer,
    settings,
    setPhase,
    startNight,
    startVoting,
    advanceNextDay,
  } = useGame()

  const copy = PHASE_COPY[phase] ?? PHASE_COPY.day
  const conn = CONNECTION[connection] ?? CONNECTION.lost
  const isDay = phase === 'day'
  const showTimer = phase === 'day' || phase === 'vote'
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
        {showTimer && <TimerCard />}
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
            <p>Ekran fazy „{copy.label}” — tajne akcje i głosowanie na smartfonach.</p>
            <div className="hg-placeholder__actions">
              {phase === 'night' && (
                <button type="button" className="hg-cta" onClick={advanceNextDay}>
                  {lastDay
                    ? 'Rozpocznij głosowanie finałowe →'
                    : `Rozpocznij Dzień ${day + 1} →`}
                </button>
              )}
              <button type="button" className="hg-ghost" onClick={() => setPhase('day')}>
                ← Wróć do widoku dnia
              </button>
            </div>
          </div>
        )}
      </main>

      {isDay && (
        <div className="hg-bottom">
          <div>
            <p className="hg-bottom__title">Dzień {day} z {totalDays} • Debata {debateState}</p>
            <p className="hg-bottom__hint">
              {lastDay
                ? 'Następna faza: rada końcowa • głosowanie na telefonach'
                : `Następna faza: noc • ${formatTime(settings.nightSeconds)} • tajne akcje na telefonach`}
            </p>
          </div>
          <div className="hg-bottom__actions">
            {!lastDay && (
              <button type="button" className="hg-ghost" onClick={advanceNextDay}>
                Następny dzień (Dzień {day + 1}) ›
              </button>
            )}
            <button type="button" className="hg-cta" onClick={lastDay ? startVoting : startNight}>
              {lastDay ? 'Rozpocznij głosowanie' : 'Rozpocznij noc'} <span aria-hidden="true">→</span>
            </button>
          </div>
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
