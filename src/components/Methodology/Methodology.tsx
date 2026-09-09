import styles from './Methodology.module.css'

const steps = [
  {
    number: '01',
    title: 'We fetch the record',
    description: 'Schedule, route and actual arrival data are requested from a rail-data API.',
  },
  {
    number: '02',
    title: 'We weigh what matters',
    description: 'On-time arrivals count most. Typical delay, cancellations and recent trends also shape the score.',
  },
  {
    number: '03',
    title: 'You book with confidence',
    description: 'A simple score shows which train is most likely to make your plans work.',
  },
]

export function Methodology() {
  return (
    <section className={styles.section} id="methodology">
      <div>
        <span className={styles.kicker}>THE RAILWISE DIFFERENCE</span>
        <h2 className={styles.heading}>
          A schedule tells you the plan.
          <br />
          <em>History tells you the truth.</em>
        </h2>
      </div>
      <div className={styles.grid}>
        {steps.map((step) => (
          <article key={step.number}>
            <span className={styles.number}>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
