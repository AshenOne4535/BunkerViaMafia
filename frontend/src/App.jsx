import { useEffect } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import JoinForm from './components/JoinForm'
import HostLobby from './components/HostLobby'

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

// Przycisk pokazuje aktualny motyw; kliknięcie przełącza na drugi.
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={isDark ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      {isDark ? 'Ciemny' : 'Jasny'}
    </button>
  )
}

// Linki w nagłówku ekranu hosta. "WIDOK TELEFONU" widać tylko w trybie
// deweloperskim (npm run dev), w produkcji go nie ma.
const HOST_NAV = [
  { id: 'broadcast', label: 'TRANSMISJA LOKALNA', href: '/?host', live: true },
  { id: 'host', label: 'PANEL HOSTA', href: '/?host', current: true },
  ...(import.meta.env.DEV ? [{ id: 'phone', label: 'WIDOK TELEFONU', href: '/' }] : []),
]

function AppContent() {
  // Tymczasowo, do czasu routera: /?host otwiera ekran hosta (TV),
  // zwykły adres otwiera formularz gracza (telefon).
  const isHost = new URLSearchParams(window.location.search).has('host')

  if (isHost) {
    return (
      <HostLobby
        navItems={HOST_NAV}
        headerExtra={<ThemeToggle />}
        onStart={(data) => console.log('START', data)}
      />
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
        <ThemeToggle />
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
