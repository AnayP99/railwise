import { ArrowUp, TrainFront } from 'lucide-react'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.brand}>
        <span className={styles.brandMark}>
          <TrainFront size={17} />
        </span>
        railwise
      </span>
      <span className={styles.disclaimer}>
        Railwise is an independent planning tool, not an IRCTC service.
      </span>
      <a className={styles.backToTop} href="#top">
        Back to top <ArrowUp size={14} />
      </a>
    </footer>
  )
}
