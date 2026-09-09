import { ArrowDown, ArrowUp, CheckCircle2, AlertTriangle, XCircle, Info, Zap } from 'lucide-react'
import type { Train, RunDelay } from '../../lib/trainData'
import { formatDelay } from '../../lib/formatters'
import styles from './DelayHistory.module.css'

interface Props {
  train: Train
  source: string
  destination: string
}

function TrendIcon({ trend }: { trend: NonNullable<Train['trend']> }) {
  if (trend === 'improving') return <ArrowDown size={14} />
  if (trend === 'worsening') return <ArrowUp size={14} />
  return <span className={styles.steadyIcon}>—</span>
}

/** Format "2026-09-08" → "08 Sep (Tue)" */
function formatRunDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T12:00:00Z`)
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
  }).format(date)
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function BoardingBadge({ delay, cancelled }: { delay: number | null; cancelled?: boolean }) {
  if (cancelled) {
    return <span className={`${styles.badge} ${styles.badgeCancelled}`}>Cancelled</span>
  }
  if (delay === null) {
    return <span className={`${styles.badge} ${styles.badgeMuted}`}>No record</span>
  }
  if (delay <= 5) {
    return <span className={`${styles.badge} ${styles.badgeOnTime}`}><CheckCircle2 size={12} /> On time</span>
  }
  if (delay <= 15) {
    return <span className={`${styles.badge} ${styles.badgeMinor}`}>+{formatMins(delay)}</span>
  }
  return <span className={`${styles.badge} ${styles.badgeHeavy}`}>+{formatMins(delay)}</span>
}

function ArrivalBadge({ delay, cancelled }: { delay: number | null; cancelled?: boolean }) {
  if (cancelled) {
    return <span className={`${styles.badge} ${styles.badgeCancelled}`}>Cancelled</span>
  }
  if (delay === null) {
    return <span className={`${styles.badge} ${styles.badgeMuted}`}>No record</span>
  }
  if (delay <= 5) {
    return <span className={`${styles.badge} ${styles.badgeOnTime}`}><CheckCircle2 size={12} /> On time</span>
  }
  if (delay <= 15) {
    return <span className={`${styles.badge} ${styles.badgeOnTime}`}>+{formatMins(delay)} (on time)</span>
  }
  if (delay <= 30) {
    return <span className={`${styles.badge} ${styles.badgeMinor}`}>+{formatMins(delay)}</span>
  }
  return <span className={`${styles.badge} ${styles.badgeHeavy}`}>+{formatMins(delay)}</span>
}

function OutcomeCell({ run }: { run: RunDelay }) {
  if (run.cancelled) {
    return (
      <span className={`${styles.outcome} ${styles.outcomeCancelled}`}>
        <XCircle size={13} /> Did not run
      </span>
    )
  }
  if (run.source !== null && run.dest !== null) {
    const diff = run.source - run.dest
    // Made up at least 10 minutes en route
    if (diff >= 10) {
      return (
        <span className={`${styles.outcome} ${styles.outcomeRecovered}`}>
          <Zap size={13} /> Made up {formatMins(diff)}
        </span>
      )
    }
    // Lost at least 10 minutes en route
    if (diff <= -10) {
      return (
        <span className={`${styles.outcome} ${styles.outcomeDelayed}`}>
          <AlertTriangle size={13} /> Lost {formatMins(-diff)}
        </span>
      )
    }
    // Maintained schedule within 10 minutes
    if (run.dest <= 15) {
      return (
        <span className={`${styles.outcome} ${styles.outcomeSteady}`}>
          <CheckCircle2 size={13} /> Maintained schedule
        </span>
      )
    }
    return (
      <span className={`${styles.outcome} ${styles.outcomeSteady}`}>
        Maintained delay
      </span>
    )
  }

  if (run.dest !== null) {
    return run.dest <= 15 ? (
      <span className={`${styles.outcome} ${styles.outcomeSteady}`}>
        <CheckCircle2 size={13} /> On time arrival
      </span>
    ) : (
      <span className={`${styles.outcome} ${styles.outcomeDelayed}`}>
        Delayed arrival
      </span>
    )
  }

  return <span className={styles.mutedText}>—</span>
}

export function DelayHistory({ train, source, destination }: Props) {
  const destOnTime = train.history.filter((r) => !r.cancelled && r.dest !== null && r.dest <= 15).length
  const destObserved = train.history.filter((r) => !r.cancelled && r.dest !== null).length
  const sourceOnTime = train.history.filter((r) => !r.cancelled && r.source !== null && r.source <= 15).length
  const sourceObserved = train.history.filter((r) => !r.cancelled && r.source !== null).length

  // Ensure runs are shown newest-first
  const runs = [...train.history].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className={styles.block}>
      <div className={styles.panelTitle}>
        <div>
          <span className={styles.miniKicker}>RECENT RUNNING HISTORY</span>
          <h4>Actual boarding & arrival records</h4>
        </div>
        {train.trend && (
          <span className={styles.trend}>
            <TrendIcon trend={train.trend} />
            {train.trend === 'improving'
              ? 'Arrivals improving'
              : train.trend === 'steady'
                ? 'Arrivals holding steady'
                : 'Arrivals delayed lately'}
          </span>
        )}
      </div>

      <div className={styles.delaySplit}>
        <div>
          <span>Boarding at {source}</span>
          <strong>{formatDelay(train.avgSourceDelay)}</strong>
          <small>
            {train.onTimeDepart === null
              ? 'No departure records'
              : `${train.onTimeDepart}% departed within 15 min`}
          </small>
        </div>
        <div>
          <span>Arrival at {destination}</span>
          <strong>{formatDelay(train.avgDelay)}</strong>
          <small>
            {train.onTime === null
              ? 'No arrival records'
              : `${train.onTime}% arrived within 15 min`}
          </small>
        </div>
      </div>

      {runs.length > 0 ? (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>BOARDING ({source})</th>
                  <th>ARRIVAL ({destination})</th>
                  <th>EN-ROUTE PERFORMANCE</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run, index) => (
                  <tr key={`${run.date ?? index}`}>
                    <td className={styles.dateCell}>
                      <strong>{formatRunDate(run.date)}</strong>
                    </td>
                    <td>
                      <BoardingBadge delay={run.source} cancelled={run.cancelled} />
                    </td>
                    <td>
                      <ArrivalBadge delay={run.dest} cancelled={run.cancelled} />
                    </td>
                    <td>
                      <OutcomeCell run={run} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={styles.insight}>
            <Info size={15} />
            <span>
              Destination arrival determines the score. Notice if delays stem from <strong>rescheduled departures</strong> or are <strong>accumulated en route</strong>.
              {' '}Left on time on {sourceOnTime}/{sourceObserved} boardings; arrived on time on {destOnTime}/{destObserved} runs.
            </span>
          </p>
        </>
      ) : (
        <p className={styles.insight}>
          <Info size={15} /> The provider did not return recent running history for this train.
        </p>
      )}
    </div>
  )
}
