import { useEffect } from 'react'
import type { Station } from '../lib/trainData'

/**
 * Syncs search state (from, to, date) into the browser URL as query params.
 * On mount, reads URL params and calls `onRestore` if a full search is found.
 */
export function useUrlState(
  from: Station | null,
  to: Station | null,
  date: string,
  searched: boolean,
  onRestore: (from: string, to: string, date: string) => void,
) {
  // On mount: restore search from URL if all params present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlFrom = params.get('from')
    const urlTo = params.get('to')
    const urlDate = params.get('date')
    if (urlFrom && urlTo && urlDate) {
      onRestore(urlFrom, urlTo, urlDate)
    }
    // Run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push state to URL after successful search
  useEffect(() => {
    if (!searched || !from || !to) return
    const params = new URLSearchParams()
    params.set('from', from.code)
    params.set('to', to.code)
    params.set('date', date)
    const url = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', url)
  }, [searched, from, to, date])
}

