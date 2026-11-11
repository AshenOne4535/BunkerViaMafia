import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import JoinForm from './components/JoinForm'
import HostLobby from './components/HostLobby'
import YourCard from './components/YourCard'

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

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

const HOST_NAV = [
  { id: 'broadcast', label: 'TRANSMISJA LOKALNA', href: '/?host', live: true },
  { id: 'host', label: 'PANEL HOSTA', href: '/?host', current: true },
  ...(import.meta.env.DEV ? [{ id: 'phone', label: 'WIDOK TELEFONU', href: '/' }] : []),
]

function AppContent() {
  const isHost = new URLSearchParams(window.location.search).has('host')

  // Состояние для экрана телефона (Task 11 -> Task 15)
  const [joined, setJoined] = useState(null)

  // Состояние для экрана Хоста / ТВ (Task 7, 8, 10)
  const [roomData, setRoomData] = useState(null)
  const [players, setPlayers] = useState([])
  const [connStatus, setConnStatus] = useState('connecting')

  useEffect(() => {
    if (!isHost) return

    let connection = null

    async function initHostRoom() {
      try {
        // 1. Создаем комнату в БД PostgreSQL и получаем QR-код
        const frontendUrl = window.location.origin
        const res = await fetch(`${API_URL}/api/rooms/create?frontendUrl=${encodeURIComponent(frontendUrl)}`, {
          method: 'POST',
        })
        if (!res.ok) throw new Error('Błąd tworzenia pokoju')
        const data = await res.json()

        setRoomData(data)
        setPlayers(data.room.players || [])

        // 2. Подключаемся к SignalR Хабу
        connection = new signalR.HubConnectionBuilder()
          .withUrl(`${API_URL}/hubs/game`)
          .withAutomaticReconnect()
          .build()

        // Слушаем событие входа нового игрока (названия полей уже совпадают!)
        connection.on('PlayerJoined', (newPlayer) => {
          setPlayers((prev) => [...prev, newPlayer])
        })

        connection.onreconnecting(() => setConnStatus('connecting'))
        connection.onreconnected(() => setConnStatus('stable'))
        connection.onclose(() => setConnStatus('lost'))

        await connection.start()
        await connection.invoke('JoinRoomGroup', data.room.code)
        setConnStatus('stable')
      } catch (err) {
        console.error('Błąd inicjalizacji Hosta:', err)
        setConnStatus('lost')
      }
    }

    initHostRoom()

    return () => {
      if (connection) {
        connection.stop()
      }
    }
  }, [isHost])

  async function handleStartGame(settings) {
    if (!roomData?.room?.code) return
    try {
      const res = await fetch(`${API_URL}/api/rooms/${roomData.room.code}/assign-roles`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Błąd losowania ról')
      console.log('Gra wystartowała, role rozdane:', data)
    } catch (err) {
      console.error('Błąd startu gry:', err.message)
    }
  }

  if (isHost) {
    return (
      <HostLobby
        roomCode={roomData?.room?.code ?? '....'}
        players={players}
        connection={connStatus}
        qrSrc={roomData?.qrCodeBase64}
        joinUrl={roomData?.joinUrl}
        navItems={HOST_NAV}
        headerExtra={<ThemeToggle />}
        onStart={handleStartGame}
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

      {joined ? (
  <YourCard roomCode={joined.code} playerId={joined.player?.id} />
) : (
  <JoinForm onJoined={setJoined} />
)}
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