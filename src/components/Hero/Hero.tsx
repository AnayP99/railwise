import { Check, Clock3, Info, Sparkles } from 'lucide-react'
import { SearchPanel } from '../SearchPanel/SearchPanel'
import type { Station } from '../../lib/trainData'
import styles from './Hero.module.css'

interface Props {
  from: Station | null
  to: Station | null
  date: string
  searching: boolean
  error: string
  onFromChange: (station: Station | null) => void
  onToChange: (station: Station | null) => void
  onDateChange: (date: string) => void
  onSwap: () => void
  onSearch: () => void
}

export function Hero({
  from,
  to,
  date,
  searching,
  error,
  onFromChange,
  onToChange,
  onDateChange,
  onSwap,
  onSearch,
}: Props) {
  return (
    <section className={styles.hero} id="top">
      <div className={styles.eyebrow}>
        <Sparkles size={14} /> Travel smarter, not just faster
      </div>
      <h1 className={styles.heading}>
        Book the train that <em>shows up.</em>
      </h1>
      <p className={styles.subtitle}>
        Compare real schedules with running history to choose the most reliable journey.
      </p>
      <SearchPanel
        from={from}
        to={to}
        date={date}
        searching={searching}
        onFromChange={onFromChange}
        onToChange={onToChange}
        onDateChange={onDateChange}
        onSwap={onSwap}
        onSearch={onSearch}
      />
      <div className={styles.reassurance}>
        <Check size={15} /> Schedules and delays are fetched from a live data provider{' '}
        <span className={styles.dot} />
        <Clock3 size={15} /> No embedded train records
      </div>
      {error && (
        <div className={styles.apiError} role="alert">
          <Info size={16} /> {error}
        </div>
      )}
    </section>
  )
}

