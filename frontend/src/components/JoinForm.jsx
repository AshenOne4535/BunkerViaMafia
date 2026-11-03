import { useState } from 'react'
import './JoinForm.css'

const CODE_LENGTH = 4
const NICK_MIN = 2
const NICK_MAX = 16

// Kod pokoju: 4 znaki, tylko A-Z i 0-9 (np. A7X2)
const CODE_REGEX = /^[A-Z0-9]{4}$/
// Nick: litery (też polskie), cyfry, spacja, _ i -
const NICK_REGEX = /^[\p{L}\p{N} _-]+$/u

function validate({ code, nick }) {
  const errors = {}

  const trimmed = nick.trim()
  if (trimmed.length < NICK_MIN) {
    errors.nick = `Nick: minimum ${NICK_MIN} znaki`
  } else if (trimmed.length > NICK_MAX) {
    errors.nick = `Nick: maksymalnie ${NICK_MAX} znaków`
  } else if (!NICK_REGEX.test(trimmed)) {
    errors.nick = 'Niedozwolone znaki w nicku'
  }

  if (code.length !== CODE_LENGTH) {
    errors.code = `Kod musi mieć ${CODE_LENGTH} znaki`
  } else if (!CODE_REGEX.test(code)) {
    errors.code = 'Tylko litery A–Z i cyfry'
  }

  return errors
}

// TODO (SignalR, Task 7 + 10): zamienić na prawdziwe wywołanie serwera,
// które sprawdza, czy pokój istnieje, i dołącza gracza.
// Na razie symulujemy odpowiedź. Kod "ZZZZ" udaje nieistniejący pokój.
async function joinRoom({ code, nick }) {
  await new Promise((resolve) => setTimeout(resolve, 600))
  if (code === 'ZZZZ') {
    throw new Error('Nie znaleziono pokoju o tym kodzie')
  }
  return { code, nick }
}

function LockIcon() {
  return (
    <svg
      className="join__lock"
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
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export default function JoinForm({ onJoined, initialCode = '' }) {
  const [nick, setNick] = useState('')
  const [code, setCode] = useState(initialCode.toUpperCase().slice(0, CODE_LENGTH))
  const [touched, setTouched] = useState({ nick: false, code: false })
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  const errors = validate({ code, nick })
  const isValid = Object.keys(errors).length === 0
  const showNickError = touched.nick && errors.nick
  const showCodeError = touched.code && errors.code

  const handleNickChange = (e) => {
    setNick(e.target.value.slice(0, NICK_MAX))
    setSubmitError('')
  }

  const handleCodeChange = (e) => {
    // automatycznie wielkie litery, bez znaków specjalnych
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, CODE_LENGTH)
    setCode(value)
    setSubmitError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTouched({ nick: true, code: true })
    if (!isValid || loading) return

    setLoading(true)
    setSubmitError('')
    try {
      const result = await joinRoom({ code, nick: nick.trim() })
      onJoined?.(result)
    } catch (err) {
      setSubmitError(err.message || 'Nie udało się dołączyć. Spróbuj ponownie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="join">
      <header className="join__top">
        <div className="join__brand">
          <h1 className="join__logo">BUNKIER</h1>
          <p className="join__tagline">UKRYTE ZAGROŻENIE</p>
        </div>
        <div className="join__room" aria-hidden="true">
          <span className="join__room-label">POKÓJ</span>
          <span className="join__room-code">{code || '····'}</span>
        </div>
      </header>

      <form className="join__form" onSubmit={handleSubmit} noValidate>
        <section className="join__panel">
          <h2 className="join__title">DOŁĄCZ DO POKOJU</h2>
          <p className="join__hint">
            Wpisz nick i kod z ekranu gospodarza. Rejestracja nie jest potrzebna.
          </p>
        </section>

        <div className="field">
          <div className="field__row">
            <label className="field__label" htmlFor="nick">
              NICK
            </label>
            <span className="field__counter">
              {nick.length} / {NICK_MAX}
            </span>
          </div>
          <input
            id="nick"
            className={`field__input${showNickError ? ' field__input--error' : ''}`}
            type="text"
            autoComplete="nickname"
            placeholder="np. Szczur"
            value={nick}
            onChange={handleNickChange}
            onBlur={() => setTouched((t) => ({ ...t, nick: true }))}
            aria-invalid={Boolean(showNickError)}
            aria-describedby={showNickError ? 'nick-error' : undefined}
          />
          {showNickError && (
            <p id="nick-error" className="field__error" role="alert">
              {errors.nick}
            </p>
          )}
        </div>

        <div className="field">
          <div className="field__row">
            <label className="field__label" htmlFor="room-code">
              KOD POKOJU
            </label>
            <span className="field__counter">
              {code.length} / {CODE_LENGTH}
            </span>
          </div>
          <input
            id="room-code"
            className={`field__input field__input--code${showCodeError ? ' field__input--error' : ''}`}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="A7X2"
            value={code}
            onChange={handleCodeChange}
            onBlur={() => setTouched((t) => ({ ...t, code: true }))}
            aria-invalid={Boolean(showCodeError)}
            aria-describedby={showCodeError ? 'room-code-error' : undefined}
          />
          {showCodeError && (
            <p id="room-code-error" className="field__error" role="alert">
              {errors.code}
            </p>
          )}
        </div>

        {submitError && (
          <p className="join__error" role="alert">
            {submitError}
          </p>
        )}

        <div className="join__bar">
          <button
            className={`join__button${isValid ? '' : ' join__button--idle'}`}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              'ŁĄCZENIE…'
            ) : (
              <>
                {!isValid && <LockIcon />}
                DOŁĄCZ
              </>
            )}
          </button>
        </div>
      </form>
    </main>
  )
}
