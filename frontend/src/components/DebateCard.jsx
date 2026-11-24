import { useGame } from '../context/GameContext.jsx'
import { TRAIT_CATEGORIES, formatTime, initials } from '../context/gameData.js'
import './DebateCard.css'

export default function DebateCard() {
  const { speaker, players, debate, timer, toggleTimer, resetTimer, nextSpeaker, selectSpeaker } = useGame()

  if (!speaker) {
    return (
      <section className="dc dc--empty" aria-label="Karta Debaty">
        <p className="dc__caption">Brak aktywnego mówcy</p>
      </section>
    )
  }

  const spotlightCat = TRAIT_CATEGORIES.find((c) => c.key === speaker.lastRevealed)
  const spotlight = spotlightCat ? speaker.traits[spotlightCat.key] : null
  const others = TRAIT_CATEGORIES.filter(
    (c) => c.key !== speaker.lastRevealed && speaker.traits[c.key]?.revealed,
  )
  const queue = players.filter((p) => p.status === 'aktywny')
  const expired = timer.remaining === 0

  return (
    <section className="dc" aria-label="Karta Debaty">
      <div className="dc__top">
        <span className="hg-label">Karta debaty</span>
        <span>Widoczne dla wszystkich</span>
      </div>

      <div className="dc__speaker">
        <div className="dc-avatar" aria-hidden="true">{initials(speaker.nick)}</div>
        <div>
          <h3 className="dc__nick">{speaker.nick}</h3>
          <p className="dc__caption">Aktywny mówca</p>
        </div>
        {speaker.muted && <span className="dc__gag">Pozbawiony głosu · tylko gesty</span>}
      </div>

      <div className="dc__spot">
        <div className="dc__top">
          <span className="hg-label">Kategoria</span>
          <span>{spotlightCat ? spotlightCat.label : '—'}</span>
        </div>
        {spotlight?.revealed ? (
          <>
            <p className="dc__value">{spotlight.value}</p>
            {spotlight.note && <p className="dc__caption">{spotlight.note}</p>}
          </>
        ) : (
          <p className="dc__caption">Gracz nie odkrył jeszcze żadnej karty</p>
        )}
      </div>

      {others.length > 0 && (
        <ul className="dc__known" aria-label="Pozostałe odkryte cechy">
          {others.map((c) => (
            <li key={c.key} className="dc__known-chip">
              {c.short}: <strong>{speaker.traits[c.key].value}</strong>
            </li>
          ))}
        </ul>
      )}

      <div className="dc__controls">
        <span className={`dc__clock${expired ? ' is-expired' : ''}`}>
          Czas debaty {formatTime(timer.remaining)}
        </span>
        <button type="button" className="dc-btn" onClick={toggleTimer} disabled={expired}>
          {timer.running ? 'Pauza' : 'Wznów'}
        </button>
        <button type="button" className="dc-btn" onClick={resetTimer}>Reset</button>
        <button type="button" className="dc-btn dc-btn--primary" onClick={nextSpeaker}>
          Następny mówca ›
        </button>
      </div>

      <div>
        <p className="dc__caption">Kolejka wystąpień</p>
        <ol className="dc__queue">
          {queue.map((p, i) => {
            const isNow = p.id === speaker.id
            const isDone = !isNow && debate.spoken.includes(p.id)
            return (
              <li
                key={p.id}
                className={`dc-q${isNow ? ' is-now' : ''}${isDone ? ' is-done' : ''}`}
                onClick={() => selectSpeaker?.(p.id)}
                style={{ cursor: 'pointer' }}
                title={`Ustaw mówcę: ${p.nick}`}
              >
                <span>{i + 1}</span> {p.nick}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}