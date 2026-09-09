import { useEffect, useRef, useState } from 'react'
import { railService } from '../lib/railService'
import type { Station } from '../lib/trainData'

const DEBOUNCE_MS = 300

export function useStationSearch() {
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Station[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(0)
  const requestIdRef = useRef(0)

  useEffect(() => {
    return () => window.clearTimeout(debounceRef.current)
  }, [])

  function updateQuery(value: string) {
    setQuery(value)
    window.clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setMatches([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = window.setTimeout(async () => {
      const id = ++requestIdRef.current
      try {
        const stations = await railService.searchStations(value)
        if (requestIdRef.current === id) setMatches(stations)
      } catch {
        if (requestIdRef.current === id) setMatches([])
      } finally {
        if (requestIdRef.current === id) setLoading(false)
      }
    }, DEBOUNCE_MS)
  }

  function reset() {
    setQuery('')
    setMatches([])
    setLoading(false)
    window.clearTimeout(debounceRef.current)
  }

  return { query, matches, loading, updateQuery, reset }
}

