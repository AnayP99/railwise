import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import type { Station, Train } from '../../lib/trainData'
import type { SortMode, TimeFilter } from '../../hooks/useTrainSearch'
import { formatDate } from '../../lib/formatters'
import { TrainCard } from '../TrainCard/TrainCard'
import { EmptyResult, IntroResult } from '../EmptyState/EmptyState'
import styles from './TrainResults.module.css'

interface Props {
  searched: boolean
  from: Station | null
  to: Station | null
  date: string
  filteredTrains: Train[]
  allTrains: Train[]
  historyDays: number | null
  liveNote: string
  expanded: string
  analysingIds: Set<string>
  sort: SortMode
  onlyReliable: boolean
  timeFilter: TimeFilter
  onSortChange: (sort: SortMode) => void
  onReliableChange: (value: boolean) => void
  onTimeFilterChange: (filter: TimeFilter) => void
  onToggleTrain: (train: Train) => void
  onCopyLink: () => void
}

const timeLabels: Record<TimeFilter, string> = {
  all: 'All times',
  morning: 'Morning (4–12)',
  afternoon: 'Afternoon (12–17)',
  evening: 'Evening (17–21)',
  night: 'Night (21–4)',
}

export function TrainResults({
  searched,
  from,
  to,
  date,
  filteredTrains,
  allTrains,
  historyDays,
  liveNote,
  expanded,
  analysingIds,
  sort,
  onlyReliable,
  timeFilter,
  onSortChange,
  onReliableChange,
  onTimeFilterChange,
  onToggleTrain,
  onCopyLink,
}: Props) {
  if (!searched) return <IntroResult />

  // Score-dependent controls activate once at least one train has been analysed
  const hasAnyScores = allTrains.some((t) => t.score !== null || t.sampleSize > 0)
  const scoreControlsDisabled = !hasAnyScores

  return (
    <>
      <div className={styles.heading}>
        <div>
          <span className={styles.kicker}>YOUR JOURNEY</span>
          <h2>
            {from?.name} <span className={styles.arrow}>→</span> {to?.name}
          </h2>
          <p>
            {filteredTrains.length} trains found <span className={styles.dot}>·</span>{' '}
            {formatDate(date)}
          </p>
        </div>
        <div className={styles.liveNote}>
          <span className={styles.pulse} /> {historyDays ? liveNote : 'Live data'}
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <SlidersHorizontal size={16} />
          <div
            className={scoreControlsDisabled ? styles.disabledGroup : ''}
            title={scoreControlsDisabled ? 'Analyse a train first to enable score filters' : undefined}
          >
            <button
              className={onlyReliable ? styles.selected : ''}
              onClick={() => !scoreControlsDisabled && onReliableChange(!onlyReliable)}
              disabled={scoreControlsDisabled}
            >
              Reliable only {onlyReliable && <X size={14} />}
            </button>
          </div>
          <div className={styles.timeDropdown}>
            <button className={timeFilter !== 'all' ? styles.selected : ''}>
              {timeFilter === 'all' ? 'Departure time' : timeLabels[timeFilter]} <ChevronDown size={14} />
            </button>
            <div className={styles.timeMenu}>
              {(Object.keys(timeLabels) as TimeFilter[]).map((key) => (
                <button
                  key={key}
                  className={timeFilter === key ? styles.activeTime : ''}
                  onClick={() => onTimeFilterChange(key)}
                >
                  {timeLabels[key]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className={styles.sortLabel}>
          Sort by{' '}
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortMode)}
          >
            <option value="earliest">Earliest departure</option>
            <option value="fastest">Fastest journey</option>
            <option
              value="best"
              disabled={scoreControlsDisabled}
              title={scoreControlsDisabled ? 'Analyse trains to sort by reliability' : undefined}
            >
              Best reliability{scoreControlsDisabled ? ' (analyse first)' : ''}
            </option>
          </select>
        </label>
      </div>

      {scoreControlsDisabled && (
        <p className={styles.scoreHint}>
          Expand a train below to analyse its reliability history, then score-based sorting and filtering will activate.
        </p>
      )}

      <div className={styles.trainList} aria-live="polite">
        {filteredTrains.map((train, index) => (
          <TrainCard
            key={train.id}
            train={train}
            recommended={
              index === 0 && sort === 'best' && (train.score ?? 0) >= 70 && !onlyReliable
            }
            expanded={expanded === train.id}
            isAnalysing={analysingIds.has(train.id)}
            source={from?.name ?? 'Source'}
            destination={to?.name ?? 'Destination'}
            onToggle={() => onToggleTrain(train)}
            onCopyLink={onCopyLink}
          />
        ))}
        {filteredTrains.length === 0 && <EmptyResult reliable={onlyReliable} />}
      </div>
    </>
  )
}
