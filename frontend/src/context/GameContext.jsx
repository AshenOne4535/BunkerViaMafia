/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import {
  advanceRoomNextDay,
  assignRoomCards,
  assignRoomRoles,
  createHostRoom,
  getRoomEvents,
  getRoomPublicCards,
  getRoomTimer,
  pauseRoomTimer,
  resetRoomTimer,
  resumeRoomTimer,
  startRoomTimer,
  updateRoomSettings,
} from '../api/hostGame.js'
import {
  MOCK_GAME,
  buildEmptyTraits,
  createPlayer,
  mapServerEvent,
  mapServerPhase,
  normalizeTraitKey,
} from './gameData.js'

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:7110'

const GameContext = createContext(null)

const activeIds = (players) => players.filter((p) => p.status === 'aktywny').map((p) => p.id)

function shuffleArray(items) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function mergeServerCardsIntoPlayers(basePlayers, serverPlayersCards) {
  const cardsByPlayerId = new Map(
    (serverPlayersCards || []).map((entry) => [String(entry.id).toLowerCase(), entry.cards || []])
  )

  return basePlayers.map((player) => {
    const cards = cardsByPlayerId.get(String(player.id).toLowerCase())
    if (!cards || cards.length === 0) return player

    const nextTraits = { ...buildEmptyTraits(), ...player.traits }
    let latestCategory = player.lastRevealed

    for (const c of cards) {
      const key = normalizeTraitKey(c.category)
      if (!key) continue
      if (c.isRevealed) {
        nextTraits[key] = {
          revealed: true,
          value: c.value,
          note: c.description ?? null,
          revealedOnDay: c.revealedOnDay ?? null,
        }
        latestCategory = key
      } else {
        nextTraits[key] = { revealed: false }
      }
    }

    return {
      ...player,
      traits: nextTraits,
      lastRevealed: latestCategory,
    }
  })
}

function reducer(state, action) {
  switch (action.type) {
    case 'SYNC':
      return { ...state, ...action.payload }

    case 'ROOM_CREATED': {
      const { room, qrCodeBase64, joinUrl } = action.payload
      return {
        ...state,
        room: {
          id: room.id,
          code: room.code,
          qrCodeBase64,
          joinUrl,
        },
        bunker: {
          ...state.bunker,
          seats: room.bunkerCapacity ?? state.bunker.seats,
        },
        lobbyPlayers: room.players || [],
      }
    }

    case 'CONN_STATUS':
      return { ...state, connStatus: action.status }

    case 'LOBBY_PLAYER_JOINED': {
      const newPlayer = action.player
      if (!newPlayer) return state
      if (state.lobbyPlayers.some((p) => String(p.id).toLowerCase() === String(newPlayer.id).toLowerCase())) {
        return state
      }
      return {
        ...state,
        lobbyPlayers: [...state.lobbyPlayers, newPlayer],
      }
    }

    case 'GAME_START_PENDING':
      return { ...state, startingGame: true, startError: '' }

    case 'GAME_START_FAILED':
      return { ...state, startingGame: false, startError: action.error || 'Błąd startu gry.' }

    case 'GAME_STARTED': {
      const { settings, players, bunkerSeats, timerDto, events } = action.payload
      const orderedForQueue =
        settings?.revealOrder === 'random' ? shuffleArray(players) : players

      return {
        ...state,
        startingGame: false,
        startError: '',
        phase: timerDto ? mapServerPhase(timerDto.currentPhase) : 'day',
        day: timerDto?.currentDay ?? 1,
        totalDays: timerDto?.maxDays ?? settings?.days ?? state.totalDays,
        daysProgress: timerDto?.days ?? [],
        dayProgressPercent: timerDto?.dayProgressPercent ?? 0,
        settings: { ...state.settings, ...settings },
        bunker: {
          ...state.bunker,
          seats: bunkerSeats ?? state.bunker.seats,
        },
        players: orderedForQueue,
        debate: {
          speakerId: orderedForQueue[0]?.id ?? null,
          spoken: [],
        },
        timer: timerDto
          ? {
              total: timerDto.totalSeconds,
              remaining: timerDto.remainingSeconds,
              running: timerDto.isRunning,
              paused: timerDto.isPaused,
            }
          : {
              total: (settings?.dayMinutes ?? 5) * 60,
              remaining: (settings?.dayMinutes ?? 5) * 60,
              running: true,
              paused: false,
            },
        events: events ?? state.events,
      }
    }

    case 'TIMER_UPDATED': {
      const dto = action.payload
      if (!dto) return state
      const mappedPhase = mapServerPhase(dto.currentPhase)
      let nextPhase = mappedPhase
      if (state.phase === 'lobby') {
        nextPhase = 'lobby'
      } else if (state.phase === 'night' && dto.currentPhase === 'DayDiscussion' && !dto.isRunning) {
        nextPhase = 'night'
      }

      return {
        ...state,
        phase: nextPhase,
        day: dto.currentDay ?? state.day,
        totalDays: dto.maxDays ?? state.totalDays,
        daysProgress: dto.days ?? state.daysProgress,
        dayProgressPercent:
          typeof dto.dayProgressPercent === 'number'
            ? dto.dayProgressPercent
            : state.dayProgressPercent,
        timer: {
          total: dto.totalSeconds ?? state.timer.total,
          remaining: dto.remainingSeconds ?? state.timer.remaining,
          running: Boolean(dto.isRunning),
          paused: Boolean(dto.isPaused),
        },
      }
    }

    case 'DAY_PROGRESS_UPDATED': {
      const dto = action.payload
      if (!dto) return state
      const nextDay = dto.currentDay ?? state.day
      const isNewDay = nextDay !== state.day
      const order = activeIds(state.players)

      return {
        ...state,
        phase: state.phase === 'lobby' ? 'lobby' : mapServerPhase(dto.currentPhase),
        day: nextDay,
        totalDays: dto.maxDays ?? state.totalDays,
        daysProgress: dto.days ?? state.daysProgress,
        dayProgressPercent:
          typeof dto.dayProgressPercent === 'number'
            ? dto.dayProgressPercent
            : state.dayProgressPercent,
        debate: isNewDay
          ? { speakerId: order[0] ?? state.debate.speakerId, spoken: [] }
          : state.debate,
      }
    }

    case 'EVENT_ADDED': {
      const mapped = action.event
      if (!mapped) return state
      if (state.events.some((e) => e.id === mapped.id)) return state
      return {
        ...state,
        events: [mapped, ...state.events].slice(0, 100),
      }
    }

    case 'EVENTS_LOADED':
      return { ...state, events: action.events || [] }

    case 'CARD_REVEALED': {
      const { playerId, card } = action.payload || {}
      if (!playerId || !card) return state
      const categoryKey = normalizeTraitKey(card.category)
      if (!categoryKey) return state

      const updatedPlayers = state.players.map((p) => {
        if (String(p.id).toLowerCase() !== String(playerId).toLowerCase()) return p
        return {
          ...p,
          lastRevealed: categoryKey,
          traits: {
            ...p.traits,
            [categoryKey]: {
              revealed: true,
              value: card.value,
              note: card.description ?? null,
              revealedOnDay: card.revealedOnDay ?? state.day,
            },
          },
        }
      })

      return {
        ...state,
        players: updatedPlayers,
      }
    }

    case 'NEXT_SPEAKER': {
      const order = activeIds(state.players)
      if (order.length === 0) return state
      const done = [...new Set([...state.debate.spoken, state.debate.speakerId].filter(Boolean))]
      const next = order.find((id) => !done.includes(id))
      return {
        ...state,
        debate: next
          ? { speakerId: next, spoken: done }
          : { speakerId: order[0], spoken: [] },
      }
    }

    case 'SELECT_SPEAKER': {
      if (!action.playerId) return state
      return {
        ...state,
        debate: { ...state.debate, speakerId: action.playerId },
      }
    }

    case 'SET_PHASE':
      return { ...state, phase: action.phase, timer: { ...state.timer, running: false } }

    default:
      return state
  }
}

export function GameProvider({ children, initialPhase = 'lobby', initialState = MOCK_GAME }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => ({
    ...init,
    phase: initialPhase,
  }))

  const roomCodeRef = useRef(state.room?.code)
  const phaseRef = useRef(state.phase)

  useEffect(() => {
    roomCodeRef.current = state.room?.code
    phaseRef.current = state.phase
  }, [state.room?.code, state.phase])

  // Inicjalizacja pokoju na serwerze i połączenia SignalR (Task 7, 10, 16, 19, 20)
  useEffect(() => {
    let cancelled = false
    let connection = null

    async function initHost() {
      try {
        dispatch({ type: 'CONN_STATUS', status: 'connecting' })
        const data = await createHostRoom(window.location.origin)
        if (cancelled) return

        dispatch({ type: 'ROOM_CREATED', payload: data })
        const code = data.room.code

        connection = new signalR.HubConnectionBuilder()
          .withUrl(`${API_URL}/hubs/game`)
          .withAutomaticReconnect()
          .build()

        connection.on('PlayerJoined', (newPlayer) => {
          if (!cancelled) {
            dispatch({ type: 'LOBBY_PLAYER_JOINED', player: newPlayer })
          }
        })

        // Task 19: Nowe wydarzenie w Feedzie Wydarzeń
        connection.on('GameEventCreated', (eventDto) => {
          if (!cancelled && eventDto) {
            dispatch({ type: 'EVENT_ADDED', event: mapServerEvent(eventDto) })
          }
        })

        // Task 20: Serwerowy zegar dyskusji + postęp dni
        connection.on('TimerUpdated', (timerDto) => {
          if (!cancelled && timerDto) {
            dispatch({ type: 'TIMER_UPDATED', payload: timerDto })
          }
        })

        connection.on('DayProgressUpdated', (progressDto) => {
          if (!cancelled && progressDto) {
            dispatch({ type: 'DAY_PROGRESS_UPDATED', payload: progressDto })
          }
        })

        // Task 16: Gracz odsłonił kartę cechy ze smartfona
        connection.on('CardRevealed', (revealPayload) => {
          if (!cancelled && revealPayload) {
            dispatch({ type: 'CARD_REVEALED', payload: revealPayload })
          }
        })

        connection.onreconnecting(() => {
          if (!cancelled) dispatch({ type: 'CONN_STATUS', status: 'connecting' })
        })

        connection.onreconnected(async () => {
          if (cancelled) return
          dispatch({ type: 'CONN_STATUS', status: 'stable' })
          try {
            await connection.invoke('JoinRoomGroup', code)
            if (phaseRef.current !== 'lobby') {
              const [timerDto, rawEvents] = await Promise.all([
                getRoomTimer(code).catch(() => null),
                getRoomEvents(code, 50).catch(() => null),
              ])
              if (timerDto) dispatch({ type: 'TIMER_UPDATED', payload: timerDto })
              if (rawEvents) dispatch({ type: 'EVENTS_LOADED', events: rawEvents.map(mapServerEvent) })
            }
          } catch (err) {
            console.error('Błąd resynchronizacji SignalR Hosta:', err)
          }
        })

        connection.onclose(() => {
          if (!cancelled) dispatch({ type: 'CONN_STATUS', status: 'lost' })
        })

        await connection.start()
        await connection.invoke('JoinRoomGroup', code)
        if (!cancelled) {
          dispatch({ type: 'CONN_STATUS', status: 'stable' })
        }

        const initialEvents = await getRoomEvents(code, 30).catch(() => [])
        if (!cancelled && Array.isArray(initialEvents)) {
          dispatch({ type: 'EVENTS_LOADED', events: initialEvents.map(mapServerEvent) })
        }
      } catch (err) {
        console.error('Błąd inicjalizacji Hosta:', err)
        if (!cancelled) dispatch({ type: 'CONN_STATUS', status: 'lost' })
      }
    }

    initHost()

    return () => {
      cancelled = true
      if (connection) {
        connection.stop()
      }
    }
  }, [])

  const startGame = useCallback(async ({ settings, players: passedPlayers } = {}) => {
    const code = roomCodeRef.current
    if (!code || code === '....') return

    dispatch({ type: 'GAME_START_PENDING' })
    try {
      // 1. Zapisz ustawienia gry z panelu Hosta (Task 20)
      const updatedRoom = await updateRoomSettings(code, settings)

      // 2. Przydziel po 6 kart cech wszystkim graczom (Task 14)
      await assignRoomCards(code)

      // 3. Wylosuj tajne role + uruchom Dzień 1 i serwerowy zegar (Task 13 + Task 20)
      const rolesData = await assignRoomRoles(code)

      // 4. Pobierz początkowy stan kart (zamaskowane dla TV), wydarzeń i zegara
      const [publicCards, rawEvents, fallbackTimer] = await Promise.all([
        getRoomPublicCards(code).catch(() => []),
        getRoomEvents(code, 50).catch(() => []),
        rolesData?.timer ? Promise.resolve(rolesData.timer) : getRoomTimer(code).catch(() => null),
      ])

      const sourcePlayers =
        Array.isArray(passedPlayers) && passedPlayers.length > 0
          ? passedPlayers
          : updatedRoom?.players || []

      const initialPlayers = mergeServerCardsIntoPlayers(
        sourcePlayers.map(createPlayer),
        publicCards
      )

      dispatch({
        type: 'GAME_STARTED',
        payload: {
          settings,
          players: initialPlayers,
          bunkerSeats: updatedRoom?.bunkerCapacity,
          timerDto: fallbackTimer,
          events: Array.isArray(rawEvents) ? rawEvents.map(mapServerEvent) : [],
        },
      })
    } catch (err) {
      console.error('Błąd startu gry:', err)
      dispatch({ type: 'GAME_START_FAILED', error: err.message })
    }
  }, [])

  const toggleTimer = useCallback(async () => {
    const code = roomCodeRef.current
    if (!code || code === '....') return
    try {
      const dto = state.timer.running
        ? await pauseRoomTimer(code)
        : state.timer.paused
          ? await resumeRoomTimer(code)
          : await startRoomTimer(code)
      dispatch({ type: 'TIMER_UPDATED', payload: dto })
    } catch (err) {
      console.error('Błąd przełączania zegara:', err)
    }
  }, [state.timer.running, state.timer.paused])

  const resetTimer = useCallback(async () => {
    const code = roomCodeRef.current
    if (!code || code === '....') return
    try {
      const dto = await resetRoomTimer(code)
      dispatch({ type: 'TIMER_UPDATED', payload: dto })
    } catch (err) {
      console.error('Błąd resetu zegara:', err)
    }
  }, [])

  const advanceNextDay = useCallback(async () => {
    const code = roomCodeRef.current
    if (!code || code === '....') return
    try {
      const dto = await advanceRoomNextDay(code)
      dispatch({ type: 'DAY_PROGRESS_UPDATED', payload: dto })
      dispatch({ type: 'TIMER_UPDATED', payload: dto })
    } catch (err) {
      console.error('Błąd przejścia do następnego dnia:', err)
    }
  }, [])

  const startNight = useCallback(async () => {
    const code = roomCodeRef.current
    if (code && code !== '....' && state.timer.running) {
      await pauseRoomTimer(code).catch(() => null)
    }
    dispatch({ type: 'SET_PHASE', phase: 'night' })
  }, [state.timer.running])

  const startVoting = useCallback(async () => {
    await advanceNextDay()
  }, [advanceNextDay])

  const value = useMemo(() => {
    const { players } = state
    return {
      ...state,
      speaker: players.find((p) => p.id === state.debate.speakerId) ?? players[0] ?? null,
      counts: {
        inGame: players.filter((p) => p.status === 'aktywny').length,
        muted: players.filter((p) => p.status === 'aktywny' && p.muted).length,
        exiled: players.filter((p) => p.status === 'wygnany').length,
      },
      syncState: (payload) => dispatch({ type: 'SYNC', payload }),
      startGame,
      toggleTimer,
      resetTimer,
      advanceNextDay,
      nextSpeaker: () => dispatch({ type: 'NEXT_SPEAKER' }),
      selectSpeaker: (playerId) => dispatch({ type: 'SELECT_SPEAKER', playerId }),
      setPhase: (phase) => dispatch({ type: 'SET_PHASE', phase }),
      startNight,
      startVoting,
    }
  }, [state, startGame, toggleTimer, resetTimer, advanceNextDay, startNight, startVoting])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame musi być używany wewnątrz <GameProvider>')
  return ctx
}
