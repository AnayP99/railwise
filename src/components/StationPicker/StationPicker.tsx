import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { useStationSearch } from '../../hooks/useStationSearch'
import type { Station } from '../../lib/trainData'
import styles from './StationPicker.module.css'

interface Props {
  target: 'from' | 'to'
  onChoose: (target: 'from' | 'to', station: Station) => void
  onClose: () => void
}

export function StationPicker({ target, onChoose, onClose }: Props) {
  const { query, matches, loading, updateQuery } = useStationSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => Math.min(prev + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter' && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault()
      onChoose(target, matches[activeIndex])
    }
  }

  const statusText = loading
    ? 'SEARCHING LIVE STATIONS…'
    : query
      ? matches.length === 0
        ? 'NO MATCHING STATIONS'
        : 'MATCHING STATIONS'
      : 'TYPE AT LEAST 2 CHARACTERS'

  return (
    <div
      className={styles.popover}
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Select ${target === 'from' ? 'departure' : 'destination'} station`}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.searchRow}>
        <Search size={16} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { updateQuery(e.target.value); setActiveIndex(-1) }}
          placeholder="Search city or station"
          aria-label="Station search"
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls="station-listbox"
        />
        <button onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <span className={styles.label}>{statusText}</span>
      <div id="station-listbox" role="listbox">
        {matches.map((station, index) => (
          <button
            key={`${station.code}-${station.name}`}
            data-option
            role="option"
            aria-selected={index === activeIndex}
            className={index === activeIndex ? styles.highlighted : ''}
            onClick={() => onChoose(target, station)}
          >
            <MapPin size={16} />
            <span>
              <strong>{station.name}</strong>
              <small>
                {station.code}
                {station.city ? ` \u00b7 ${station.city}` : ''}
              </small>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
