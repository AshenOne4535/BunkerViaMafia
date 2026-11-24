import { useGame } from '../context/GameContext.jsx'
import { TRAIT_CATEGORIES, initials } from '../context/gameData.js'
import './AllPlayers.css'

function MuteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

function StatusBadge({ player }) {
  if (player.status === 'wygnany') {
    return <span className="ap-status ap-status--exiled">Wygnany</span>
  }
  if (player.muted) {
    return <span className="ap-status ap-status--muted"><MuteIcon /> Pozbawiony głosu</span>
  }
  return <span className="ap-status ap-status--active"><i className="ap-status__dot" /> Aktywny</span>
}

// Otwarta cecha: widać tekst. Zakryta: zaszyfrowany blok (wartość nigdy nie jest renderowana).
function TraitChip({ category, trait }) {
  const open = Boolean(trait?.revealed)
  return (
    <li
      className={`ap-chip ${open ? 'ap-chip--open' : 'ap-chip--closed'}`}
      title={`${category.label}: ${open ? trait.value : 'zakryte'}`}
    >
      <span>{category.short}:</span>
      {open ? (
        <strong className="ap-chip__value">{trait.value}</strong>
      ) : (
        <span className="ap-chip__redacted" role="img" aria-label="zakryte" />
      )}
    </li>
  )
}

function PlayerFolder({ player, isSpeaker }) {
  const exiled = player.status === 'wygnany'
  return (
    <li className={`ap-card${isSpeaker ? ' is-speaker' : ''}${exiled ? ' is-exiled' : ''}`}>
      <div className="ap-card__head">
        <div className="ap-avatar" aria-hidden="true">{initials(player.nick)}</div>
        <span className="ap-card__nick">{player.nick}</span>
        <StatusBadge player={player} />
      </div>
      <ul className="ap-chips">
        {TRAIT_CATEGORIES.map((cat) => (
          <TraitChip key={cat.key} category={cat} trait={player.traits[cat.key]} />
        ))}
      </ul>
    </li>
  )
}

export default function AllPlayers() {
  const { day, players, debate, counts } = useGame()

  return (
    <section className="ap" aria-label="Wszyscy Gracze">
      <header className="hg-panel-head ap__head">
        <h2>Wszyscy Gracze / Dzień {day}</h2>
        <span>
          {counts.inGame} w grze • {counts.muted} bez głosu
          {counts.exiled > 0 && ` • ${counts.exiled} wygnany`}
        </span>
      </header>
      <ul className="ap__list">
        {players.map((p) => (
          <PlayerFolder key={p.id} player={p} isSpeaker={p.id === debate.speakerId} />
        ))}
      </ul>
    </section>
  )
}