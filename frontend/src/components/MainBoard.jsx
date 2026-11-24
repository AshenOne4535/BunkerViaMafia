import { useGame } from '../context/GameContext.jsx'
import DebateCard from './DebateCard.jsx'
import './MainBoard.css'

export default function MainBoard() {
  const { day, disaster, bunker, counts, events } = useGame()

  return (
    <section className="mb" aria-label="Płyta Główna">
      <header className="hg-panel-head">
        <h2>Płyta Główna / Dzień {day}</h2>
        <span>{counts.inGame} w grze • {counts.muted} bez głosu</span>
      </header>

      <div className="mb-scenario">
        <article className="mb-block">
          <span className="hg-label">Katastrofa</span>
          <h3>{disaster.name}</h3>
          <p>{disaster.description}</p>
          <div
            className="mb-threat"
            role="img"
            aria-label={`Poziom zagrożenia: ${disaster.threat} z ${disaster.threatMax}`}
          >
            <span>Zagrożenie: {disaster.threatLabel}</span>
            <span className="mb-threat__bar">
              {Array.from({ length: disaster.threatMax }, (_, i) => (
                <i key={i} className={i < disaster.threat ? 'on' : ''} />
              ))}
            </span>
          </div>
        </article>

        <article className="mb-block">
          <span className="hg-label">Bunkier</span>
          <dl className="mb-stats">
            <div><dt>Miejsca</dt><dd>{bunker.seats}</dd></div>
            <div><dt>Graczy w grze</dt><dd>{counts.inGame}</dd></div>
            <div><dt>Pobyt</dt><dd>{bunker.stay}</dd></div>
          </dl>
          <ul className="mb-systems">
            {bunker.systems.map((s) => (
              <li key={s.name} className={`mb-sys mb-sys--${s.state}`}>
                {s.name}: {s.state}
              </li>
            ))}
          </ul>
          <p className="mb-rooms">{bunker.rooms.join(' · ')}</p>
        </article>
      </div>

      <DebateCard />

      {/* Prosty feed na mockach. TODO (Task 19): zastąpić komponentem <EventFeed /> */}
      <section className="mb-feed" aria-label="Feed wydarzeń">
        <h3 className="mb-feed__title">Feed wydarzeń</h3>
        <ul className="mb-feed__list">
          {events.map((e) => (
            <li key={e.id} className="mb-feed__item">
              <time className="mb-feed__time">{e.time}</time>
              <span className="mb-feed__type">{e.type}</span>
              <p>{e.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
