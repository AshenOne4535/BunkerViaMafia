import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { MOCK_GAME, createPlayer, formatTime } from './gameData.js'

const GameContext = createContext(null)

const activeIds = (players) => players.filter((p) => p.status === 'aktywny').map((p) => p.id)

function reducer(state, action) {
  switch (action.type) {
   
    case 'SYNC':
      return { ...state, ...action.payload }

   
    case 'START_GAME': {
      const { roomCode, settings, players: lobbyPlayers } = action.payload ?? {}

     
      if (!Array.isArray(lobbyPlayers) || lobbyPlayers.length === 0) {
        return {
          ...state,
          phase: 'day',
          timer: { ...state.timer, remaining: state.timer.total, running: true },
        }
      }

      // DEMO: gracze o nickach z MOCK_GAME (Nika, Wilk, Szczur…) dostają przykładowo
      // jedną odkrytą kartę, żeby widać było różnicę otwarte/zakryte.
      // TODO (SignalR): usuń to mapowanie, odkryte karty przyjdą z serwera.
      const demoByNick = new Map(MOCK_GAME.players.map((p) => [p.nick, p]))
      const players = lobbyPlayers.map((lp) => ({
        ...(demoByNick.get(lp.nick) ?? createPlayer(lp)),
        id: lp.id,
        status: 'aktywny',
        muted: false,
      }))
      const total = (settings?.dayMinutes ?? 5) * 60

      return {
        ...state,
        phase: 'day',
        room: { code: roomCode ?? state.room.code },
        day: 1,
        totalDays: settings?.days ?? state.totalDays,
        settings: { ...state.settings, ...settings },
        players,
        debate: { speakerId: players[0].id, spoken: [] },
        timer: { total, remaining: total, running: true },
        events: [
          {
            id: 'e1',
            time: formatTime(total),
            type: 'Nowy dzień',
            text: 'Rozpoczął się dzień 1. Każdy gracz odkrywa jedną kartę.',
          },
        ],
      }
    }

    case 'TICK': {
      if (!state.timer.running) return state
      const remaining = Math.max(0, state.timer.remaining - 1)
      return { ...state, timer: { ...state.timer, remaining, running: remaining > 0 } }
    }

    case 'TOGGLE_TIMER':
      if (state.timer.remaining === 0) return state
      return { ...state, timer: { ...state.timer, running: !state.timer.running } }

    case 'RESET_TIMER':
      return { ...state, timer: { ...state.timer, remaining: state.timer.total, running: false } }

    case 'NEXT_SPEAKER': {
      const order = activeIds(state.players)
      if (order.length === 0) return state
      const done = [...new Set([...state.debate.spoken, state.debate.speakerId])]
      const next = order.find((id) => !done.includes(id))
      return {
        ...state,
        debate: next
          ? { speakerId: next, spoken: done }
          : { speakerId: order[0], spoken: [] }, // wszyscy już mówili: nowy krąg
      }
    }

    case 'SET_PHASE':
      return { ...state, phase: action.phase, timer: { ...state.timer, running: false } }

    default:
      return state
  }
}

/**
 * initialPhase: 'lobby' (domyślnie) | 'day' | 'night' | 'vote'
 *   → do testów ekranu bez lobby: <GameProvider initialPhase="day">
 * initialState: własne dane zamiast MOCK_GAME
 */
export function GameProvider({ children, initialPhase = 'lobby', initialState = MOCK_GAME }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => ({
    ...init,
    phase: initialPhase,
  }))

  // Lokalny zegar. TODO (Task 20): zastąpić zegarem z serwera przez SYNC.
  useEffect(() => {
    if (!state.timer.running) return undefined
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.timer.running])

  const value = useMemo(() => {
    const { players } = state
    return {
      ...state,
      speaker: players.find((p) => p.id === state.debate.speakerId) ?? null,
      counts: {
        inGame: players.filter((p) => p.status === 'aktywny').length,
        muted: players.filter((p) => p.status === 'aktywny' && p.muted).length,
        exiled: players.filter((p) => p.status === 'wygnany').length,
      },
      syncState: (payload) => dispatch({ type: 'SYNC', payload }),
      startGame: (payload) => dispatch({ type: 'START_GAME', payload }),
      toggleTimer: () => dispatch({ type: 'TOGGLE_TIMER' }),
      resetTimer: () => dispatch({ type: 'RESET_TIMER' }),
      nextSpeaker: () => dispatch({ type: 'NEXT_SPEAKER' }),
      setPhase: (phase) => dispatch({ type: 'SET_PHASE', phase }),
      startNight: () => dispatch({ type: 'SET_PHASE', phase: 'night' }),
      startVoting: () => dispatch({ type: 'SET_PHASE', phase: 'vote' }),
    }
  }, [state])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}


export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame musi być używany wewnątrz <GameProvider>')
  return ctx
}