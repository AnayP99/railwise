import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, Search } from 'lucide-react'
import { StationPicker } from '../StationPicker/StationPicker'
import { today } from '../../lib/formatters'
import type { Station } from '../../lib/trainData'
import styles from './SearchPanel.module.css'
import { useState } from 'react'

interface Props {
  from: Station | null
  to: Station | null
  date: string
  searching: boolean
  onFromChange: (station: Station | null) => void
  onToChange: (station: Station | null) => void
  onDateChange: (date: string) => void
  onSwap: () => void
  onSearch: () => void
}

function StationField({
  label,
  station,
  tone,
  onClick,
}: {
  label: string
  station: Station | null
  tone: string
  onClick: () => void
}) {
  return (
    <div className={styles.stationField}>
      <span className={styles.fieldLabel}>{label}</span>
      <button className={styles.stationButton} onClick={onClick}>
        <span className={`${styles.stationPin} ${tone === 'destination' ? styles.destination : ''}`} />
        <span className={styles.stationInfo}>
          <strong>{station?.name ?? 'Select station'}</strong>
          <small>
            {station ? `${station.code}${station.city ? ` · ${station.city}` : ''}` : 'Search by name or code'}
          </small>
        </span>
        <ChevronDown size={17} />
      </button>
    </div>
  )
}

export function SearchPanel({
  from,
  to,
  date,
  searching,
  onFromChange,
  onToChange,
  onDateChange,
  onSwap,
  onSearch,
}: Props) {
  const [picker, setPicker] = useState<'from' | 'to' | null>(null)

  function chooseStation(target: 'from' | 'to', station: Station) {
    if (target === 'from') onFromChange(station)
    else onToChange(station)
    setPicker(null)
  }

  return (
    <div className={styles.panel} id="search">
      <StationField
        label="FROM"
        station={from}
        tone="origin"
        onClick={() => setPicker(picker === 'from' ? null : 'from')}
      />
      <button className={styles.swap} onClick={onSwap} aria-label="Swap stations">
        <ArrowDown size={16} />
        <ArrowUp size={16} />
      </button>
      <StationField
        label="TO"
        station={to}
        tone="destination"
        onClick={() => setPicker(picker === 'to' ? null : 'to')}
      />
      <label className={styles.dateField}>
        <span className={styles.fieldLabel}>DATE</span>
        <span className={styles.dateInput}>
          <CalendarDays size={18} />
          <input type="date" value={date} min={today} onChange={(e) => onDateChange(e.target.value)} />
        </span>
      </label>
      <button className={styles.searchButton} onClick={onSearch} disabled={searching}>
        {searching ? <span className="spinner" /> : <Search size={19} />}
        {searching ? 'Checking' : 'Find trains'}
      </button>
      {picker && (
        <StationPicker target={picker} onChoose={chooseStation} onClose={() => setPicker(null)} />
      )}
    </div>
  )
}

