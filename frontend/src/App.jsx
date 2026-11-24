import { ThemeProvider } from './context/ThemeContext'
import { GameProvider, useGame } from './context/GameContext.jsx'
import JoinForm from './components/JoinForm'
import HostLobby from './components/HostLobby'
import HostGameView from './components/HostGameView.jsx'
import ThemeToggleButton from './components/ThemeToggleButton.jsx'

// Linki w nagłówku ekranu hosta. "WIDOK TELEFONU" widać tylko w trybie
// deweloperskim (npm run dev), w produkcji go nie ma.
const HOST_NAV = [
  { id: 'broadcast', label: 'TRANSMISJA LOKALNA', href: '/?host', live: true },
  { id: 'host', label: 'PANEL HOSTA', href: '/?host', current: true },
  ...(import.meta.env.DEV ? [{ id: 'phone', label: 'WIDOK TELEFONU', href: '/' }] : []),
]

// Ekran hosta (TV): lobby przed startem, potem ekran gry.
// Musi być wewnątrz <GameProvider>, bo korzysta z useGame().
function HostScreen() {
  const { phase, startGame } = useGame()
  const themeToggle = <ThemeToggleButton />

  return phase === 'lobby' ? (
    <HostLobby navItems={HOST_NAV} headerExtra={themeToggle} onStart={startGame} />
  ) : (
    <HostGameView navItems={HOST_NAV} headerExtra={themeToggle} />
  )
}

function AppContent() {
  // Tymczasowo, do czasu routera: /?host otwiera ekran hosta (TV),
  // zwykły adres otwiera formularz gracza (telefon).
  const isHost = new URLSearchParams(window.location.search).has('host')

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

      <JoinForm onJoined={(data) => console.log('Dołączono:', data)} />
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