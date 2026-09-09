import { Moon, Sun, TrainFront } from 'lucide-react'
import styles from './Header.module.css'

interface Props {
  darkMode: boolean
  onToggleDark: () => void
}

export function Header({ darkMode, onToggleDark }: Props) {
  return (
    <header className={styles.topbar}>
      <a className={styles.brand} href="#top">
        <span className={styles.brandMark}>
          <TrainFront size={22} />
        </span>
        railwise
      </a>
      <nav className={styles.nav}>
        <a className={styles.active} href="#search">Find trains</a>
        <a href="#methodology">How it works</a>
      </nav>
      <button
        className={styles.themeToggle}
        onClick={onToggleDark}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        title={darkMode ? 'Light mode' : 'Dark mode'}
      >
        {darkMode ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  )
}
