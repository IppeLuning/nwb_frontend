import { useEffect, useRef, useState } from 'react'
import { lookupStreet, suggestStreets } from '../api/locatieserver'
import type { LookupDoc, SuggestDoc } from '../types/nwb'

interface StreetSearchProps {
  onSelect: (doc: LookupDoc) => void
  disabled?: boolean
}

export function StreetSearch({ onSelect, disabled }: StreetSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestDoc[]>([])
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  const skipNextSearchRef = useRef(false)

  useEffect(() => {
    window.clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }

    if (query.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const docs = await suggestStreets(query, controller.signal)
        setSuggestions(docs)
        setOpen(true)
        setError(null)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError('Kon geen suggesties ophalen')
      }
    }, 300)

    return () => window.clearTimeout(debounceRef.current)
  }, [query])

  async function handlePick(doc: SuggestDoc) {
    setOpen(false)
    setSuggestions([])
    skipNextSearchRef.current = true
    setQuery(doc.weergavenaam)
    try {
      const full = await lookupStreet(doc.id)
      onSelect(full)
    } catch {
      setError('Kon straatgegevens niet ophalen')
    }
  }

  return (
    <div className="street-search">
      <label htmlFor="street-input">Straatnaam</label>
      <input
        id="street-input"
        type="text"
        autoComplete="off"
        placeholder="Bijv. Damrak"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {error && <p className="error-text">{error}</p>}
      {open && (
        <ul className="suggestions">
          {suggestions.length === 0 ? (
            <li className="suggestions-empty">Geen straat gevonden</li>
          ) : (
            suggestions.map((doc) => (
              <li key={doc.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => handlePick(doc)}>
                  {doc.weergavenaam}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
