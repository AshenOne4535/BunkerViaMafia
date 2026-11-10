import { useEffect, useState } from 'react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import JoinForm from './components/JoinForm'
import YourCard from './components/YourCard'

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

function AppContent() {
  // Dane z formularza dołączania ({ code, nick }). Docelowo: routing + ekran Poczekalni (Task 12).
  const [joined, setJoined] = useState(null)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    
    fetch(`${apiUrl}/api/rooms/ping`)
      .then(res => res.json())
      .then(data => console.log('Odpowiedź od serwera C#:', data))
      .catch(err => console.error('Błąd połączenia z backend', err));
  }, []);
  return (
    <div className="app">
      <header className="app-bar">
        <ThemeToggle />
      </header>

      {joined ? <YourCard roomCode={joined.code} /> : <JoinForm onJoined={setJoined} />}
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
