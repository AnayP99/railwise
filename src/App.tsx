import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useTrainSearch } from './hooks/useTrainSearch'
import { useUrlState } from './hooks/useUrlState'
import { Header } from './components/Header/Header'
import { Hero } from './components/Hero/Hero'
import { TrainResults } from './components/TrainResults/TrainResults'
import { Methodology } from './components/Methodology/Methodology'
import { Footer } from './components/Footer/Footer'
import './App.css'

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('railwise-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('railwise-theme', dark ? 'dark' : 'light')
  }, [dark])

  return { dark, toggle: () => setDark((d) => !d) }
}

function App() {
  const search = useTrainSearch()
  const [notice, setNotice] = useState('')
  const { dark, toggle } = useDarkMode()

  useUrlState(
    search.from,
    search.to,
    search.date,
    search.searched,
    search.restoreFromUrl,
  )

  function copyLink() {
    const url = new URL(window.location.href)
    url.searchParams.set('from', search.from?.code ?? '')
    url.searchParams.set('to', search.to?.code ?? '')
    url.searchParams.set('date', search.date)
    navigator.clipboard.writeText(url.toString()).then(
      () => toast('Link copied to clipboard'),
      () => toast('Could not copy link'),
    )
  }

  function toast(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2800)
  }

  return (
    <main>
      <Header darkMode={dark} onToggleDark={toggle} />

      <Hero
        from={search.from}
        to={search.to}
        date={search.date}
        searching={search.searching}
        error={search.error}
        onFromChange={search.setFrom}
        onToChange={search.setTo}
        onDateChange={search.setDate}
        onSwap={search.swapStations}
        onSearch={search.handleSearch}
      />

      <section className="results-section">
        <TrainResults
          searched={search.searched}
          from={search.from}
          to={search.to}
          date={search.date}
          filteredTrains={search.filteredTrains}
          allTrains={search.trains}
          historyDays={search.historyDays}
          liveNote={search.liveNote}
          expanded={search.expanded}
          analysingIds={search.analysingIds}
          sort={search.sort}
          onlyReliable={search.onlyReliable}
          timeFilter={search.timeFilter}
          onSortChange={search.setSort}
          onReliableChange={search.setOnlyReliable}
          onTimeFilterChange={search.setTimeFilter}
          onToggleTrain={search.toggleTrain}
          onCopyLink={copyLink}
        />
      </section>

      <Methodology />
      <Footer />

      {notice && (
        <div className="toast">
          <Check size={17} /> {notice}
        </div>
      )}
    </main>
  )
}

export default App
