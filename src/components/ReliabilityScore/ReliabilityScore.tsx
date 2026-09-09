import type { CSSProperties } from 'react'
import type { Train } from '../../lib/trainData'
import styles from './ReliabilityScore.module.css'

interface Props {
  train: Train
  isAnalysing?: boolean
}

type RatingTier = {
  label: string
  className: string
}

function getRatingTier(score: number): RatingTier {
  if (score >= 85) return { label: 'Very reliable', className: styles.excellent }
  if (score >= 70) return { label: 'Reliable', className: styles.good }
  if (score >= 50) return { label: 'Moderate', className: styles.moderate }
  if (score >= 25) return { label: 'Unreliable', className: styles.poor }
  return { label: 'Severe delays', className: styles.severe }
}

export function ReliabilityScore({ train, isAnalysing }: Props) {
  if (isAnalysing && (train.score === null || train.avgDelay === null)) {
    return (
      <div className={`${styles.wrap} ${styles.noScore}`}>
        <div className={styles.ring}>
          <span className="spinner" />
        </div>
        <div>
          <strong>Scoring…</strong>
          <p>Reading past runs</p>
        </div>
      </div>
    )
  }

  if (train.score === null || train.avgDelay === null) {
    if (train.sampleSize > 0) {
      return (
        <div className={`${styles.wrap} ${styles.noScore}`}>
          <div className={styles.ring}>
            <span>—</span>
          </div>
          <div>
            <strong>Limited data</strong>
            <p>{train.sampleSize} run{train.sampleSize > 1 ? 's' : ''} found</p>
          </div>
          <div className={styles.tooltip}>
            Need at least 3 completed runs to compute a reliability score.
            {train.sampleSize > 0 && ` Found ${train.sampleSize} runs.`}
          </div>
        </div>
      )
    }

    return (
      <div className={`${styles.wrap} ${styles.noScore}`}>
        <div className={styles.ring}>
          <span>?</span>
        </div>
        <div>
          <strong>Analyse history</strong>
          <p>Uses real past runs</p>
        </div>
      </div>
    )
  }

  const { label, className: tierClass } = getRatingTier(train.score)
  // For score 0 or very low, give at least a small visible accent or full red
  const deg = train.score === 0 ? 12 : train.score * 3.6

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.ring} ${tierClass}`}
        style={{ '--score': `${deg}deg` } as CSSProperties}
      >
        <span>{train.score}</span>
      </div>
      <div>
        <strong>{label}</strong>
        <p>
          {train.avgDelay === 0
            ? 'Typically on time'
            : `avg. ${train.avgDelay} min late`}
        </p>
      </div>
      <div className={styles.tooltip}>
        <strong>{label} ({train.score}/100)</strong>
        <br />
        <b>{train.onTime}%</b> of arrivals within 15 min
        <br />
        avg. {train.avgDelay}m late arriving at destination
        {train.avgSourceDelay !== null && (
          <>
            <br />
            avg. {train.avgSourceDelay}m late leaving origin
          </>
        )}
        <br />
        from {train.sampleSize} actual recorded runs
        {train.cancelled > 0 && (
          <>
            <br />
            ({train.cancelled} cancelled in sample)
          </>
        )}
      </div>
    </div>
  )
}
