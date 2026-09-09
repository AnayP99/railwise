import type { RouteStop } from '../../lib/trainData'
import styles from './RouteTimeline.module.css'

interface Props {
  route: RouteStop[]
  onCopyLink: () => void
}

export function RouteTimeline({ route, onCopyLink }: Props) {
  return (
    <div className={styles.block}>
      <div className={styles.panelTitle}>
        <div>
          <span className={styles.miniKicker}>SCHEDULE</span>
          <h4>Key stops</h4>
        </div>
        <button className={styles.copyBtn} onClick={onCopyLink}>
          Copy link
        </button>
      </div>
      <div className={styles.list}>
        {route.map((stop, index) => (
          <div className={styles.stop} key={`${stop.station}-${index}`}>
            <div className={styles.time}>
              <strong>{stop.time}</strong>
              <small>{stop.day ?? ''}</small>
            </div>
            <div className={styles.dot}>
              <i
                className={
                  index === 0 || index === route.length - 1 ? styles.endpoint : ''
                }
              />
              {index < route.length - 1 && <span />}
            </div>
            <div className={styles.label}>
              <strong>{stop.station}</strong>
              {stop.kind && <small>{stop.kind}</small>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
