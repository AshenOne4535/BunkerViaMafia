import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { GameProvider, useGame } from './context/GameContext.jsx'
import JoinForm from './components/JoinForm'
import HostLobby from './components/HostLobby'
import HostGameView from './components/HostGameView.jsx'
import Waiting from './components/Waiting'
import YourCard from './components/YourCard'
import ThemeToggleButton from './components/ThemeToggleButton.jsx'

const HOST_NAV = [
  { id: 'broadcast', label: 'TRANSMISJA LOKALNA', href: '/?host', live: true },
  { id: 'host', label: 'PANEL HOSTA', href: '/?host', current: true },
  ...(import.meta.env.DEV ? [{ id: 'phone', label: 'WIDOK TELEFONU', href: '/' }] : []),
]

// Ekran Hosta (TV): Lobby przed startem -> Widok Gry (Task 17, 18, 19, 20)
function HostScreen() {
  const { phase, room, lobbyPlayers, connStatus, startGame } = useGame()
  const themeToggle = <ThemeToggleButton />

  if (phase === 'lobby') {
    return (
      <HostLobby
        roomCode={room?.code ?? '....'}
        players={lobbyPlayers}
        connection={connStatus}
        qrSrc={room?.qrCodeBase64}
        joinUrl={room?.joinUrl}
        navItems={HOST_NAV}
        headerExtra={themeToggle}
        onStart={startGame}
      />
    )
  }

  return (
    <HostGameView
      navItems={HOST_NAV}
      headerExtra={themeToggle}
      connection={connStatus}
    />
  )
}

function AppContent() {
  const isHost = new URLSearchParams(window.location.search).has('host')

  // Stan ekranu smartfona gracza (Task 11 -> Task 12 -> Task 15/16)
  const [joined, setJoined] = useState(null)
  const [gameStarted, setGameStarted] = useState(false)

  if (isHost) {
    return (
      <GameProvider>
        <HostScreen />
      </GameProvider>
    )
  }

  return (
    <div className="app">
      <header className="app-bar">
        {import.meta.env.DEV && (
          <a
            href="/?host"
            style={{ marginRight: 'auto', alignSelf: 'center', fontSize: 12, color: 'var(--muted)' }}
          >
            widok hosta →
          </a>
        )}
        <ThemeToggleButton />
      </header>

      {!joined && <JoinForm onJoined={setJoined} />}
      {joined && !gameStarted && (
        <>
          <Waiting
            roomCode={joined.code}
            nick={joined.nick}
            playerId={joined.player?.id}
            onGameStart={() => setGameStarted(true)}
          />
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => setGameStarted(true)}
              style={{ margin: '0 auto 12px', fontSize: 12, color: 'var(--muted)', background: 'none', border: 0, cursor: 'pointer' }}
            >
              [dev] symuluj start gry →
            </button>
          )}
        </>
      )}
      {joined && gameStarted && <YourCard roomCode={joined.code} playerId={joined.player?.id} />}
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
