import { Search, TrainFront } from 'lucide-react'
import styles from './EmptyState.module.css'

export function EmptyResult({ reliable }: { reliable: boolean }) {
  return (
    <div className={styles.empty}>
      <TrainFront size={28} />
      <h3>
        {reliable
          ? 'No trains match the reliability filter'
          : 'No train service found for this route'}
      </h3>
      <p>Try a nearby station or another travel date.</p>
    </div>
  )
}

export function IntroResult() {
  return (
    <section className={styles.intro}>
      <div>
        <span className={styles.brandMark}>
          <Search size={20} />
        </span>
        <h2>Start with a route</h2>
        <p>
          Choose two stations to see live train schedules and an evidence-based
          punctuality score.
        </p>
      </div>
      <div>
        <strong>How scoring works</strong>
        <p>
          We sample actual arrival delays over recent running days. On-time share,
          average delay and recent trend become one clear score.
        </p>
      </div>
    </section>
  )
}
