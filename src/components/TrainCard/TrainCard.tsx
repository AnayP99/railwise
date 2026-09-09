import { ChevronDown, Sparkles, TrainFront } from 'lucide-react'
import { dayLabels, type Train } from '../../lib/trainData'
import { ReliabilityScore } from '../ReliabilityScore/ReliabilityScore'
import { DelayHistory } from '../DelayHistory/DelayHistory'
import { RouteTimeline } from '../RouteTimeline/RouteTimeline'
import styles from './TrainCard.module.css'

interface Props {
  train: Train
  recommended: boolean
  expanded: boolean
  isAnalysing: boolean
  source: string
  destination: string
  onToggle: () => void
  onCopyLink: () => void
}

export function TrainCard({
  train,
  recommended,
  expanded,
  isAnalysing,
  source,
  destination,
  onToggle,
  onCopyLink,
}: Props) {
  return (
    <article className={`${styles.card} ${expanded ? styles.isExpanded : ''}`}>
      {recommended && (
        <div className={styles.recommended}>
          <Sparkles size={13} /> Best pick for reliability
        </div>
      )}

      <div className={styles.main}>
        <div className={styles.identity}>
          <div className={styles.icon}>
            <TrainFront size={22} />
          </div>
          <div>
            <h3>{train.name}</h3>
            <p>
              {train.id} <span>·</span> {train.category}
            </p>
          </div>
        </div>

        <div className={styles.journeyTimes}>
          <div>
            <strong>{train.departure}</strong>
            <span>{source}</span>
          </div>
          <div className={styles.journeyLine}>
            <span>{train.duration}</span>
            <i />
            <small>{train.stops} stops</small>
          </div>
          <div className={styles.arrival}>
            <strong>{train.arrival}</strong>
            <span>{destination}</span>
          </div>
        </div>

        <ReliabilityScore train={train} isAnalysing={isAnalysing} />

        <button
          className={styles.detailsToggle}
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide details' : train.score === null ? 'Analyse history' : 'View details'}
          <ChevronDown size={16} />
        </button>
      </div>

      <div className={styles.daysRow}>
        <span>Runs</span>
        {dayLabels.map((day, index) => (
          <b key={`${day}-${index}`} className={train.days[index] ? styles.runs : ''}>
            {day}
          </b>
        ))}
        <span className={styles.daysNote}>{train.distance}</span>
      </div>

      <div className={styles.detailWrapper}>
        <div className={styles.detailInner}>
          {expanded && (
            <div className={styles.detailPanel}>
              {isAnalysing ? (
                <div className={styles.analysisLoading}>
                  <span className="spinner" /> Collecting recent running records. Cached days
                  return immediately; new days are spaced to about a minute per train.
                </div>
              ) : (
                <>
                  <DelayHistory train={train} source={source} destination={destination} />
                  <RouteTimeline route={train.route} onCopyLink={onCopyLink} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

