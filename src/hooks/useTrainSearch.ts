import { useMemo, useRef, useState, useCallback } from 'react'
import { railService } from '../lib/railService'
import type { Station, Train } from '../lib/trainData'
import { today } from '../lib/formatters'

export type SortMode = 'best' | 'fastest' | 'earliest'
export type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening' | 'night'

function inTimeRange(departure: string, filter: TimeFilter): boolean {
  if (filter === 'all') return true
  const h = Number.parseInt(departure.slice(0, 2), 10)
  if (!Number.isFinite(h)) return true
  if (filter === 'morning') return h >= 4 && h < 12
  if (filter === 'afternoon') return h >= 12 && h < 17
  if (filter === 'evening') return h >= 17 && h < 21
  return h >= 21 || h < 4 // night
}

export function useTrainSearch() {
  const [from, setFrom] = useState<Station | null>(null)
  const [to, setTo] = useState<Station | null>(null)
  const [date, setDate] = useState(today)
  const [trains, setTrains] = useState<Train[]>([])
  const [historyDays, setHistoryDays] = useState<number | null>(null)
  const [autoAnalyseMax, setAutoAnalyseMax] = useState(3)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState('')
  const [analysingIds, setAnalysingIds] = useState<Set<string>>(new Set())
  const [sort, setSort] = useState<SortMode>('earliest')
  const [onlyReliable, setOnlyReliable] = useState(false)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const searchGen = useRef(0)

  const filteredTrains = useMemo(() => {
    let output = trains.filter((t) => inTimeRange(t.departure, timeFilter))
    if (onlyReliable) output = output.filter((t) => (t.score ?? 0) >= 70)
    if (sort === 'fastest') return output.sort((a, b) => a.duration.localeCompare(b.duration))
    if (sort === 'earliest') return output.sort((a, b) => a.departure.localeCompare(b.departure))
    return output.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }, [trains, onlyReliable, sort, timeFilter])

  const scoring = analysingIds.size > 0

  const liveNote = scoring
    ? `Scoring ${analysingIds.size} train${analysingIds.size === 1 ? '' : 's'} · ${historyDays ?? 7} recent runs`
    : trains.length > 0 && trains.length <= autoAnalyseMax
      ? `Auto-scored · ${historyDays ?? 7} recent runs`
      : historyDays
        ? `History on demand · ${historyDays} recent runs`
        : 'Live data'

  async function fillAnalysis(
    trainId: string,
    fromCode: string,
    toCode: string,
    travelDate: string,
    generation: number,
  ) {
    setAnalysingIds((cur) => new Set(cur).add(trainId))
    try {
      const analysis = await railService.analyseTrain(trainId, fromCode, toCode, travelDate)
      if (searchGen.current !== generation) return
      setTrains((cur) => cur.map((t) => (t.id === trainId ? { ...t, ...analysis } : t)))
    } catch (reason) {
      if (searchGen.current !== generation) return
      setError(reason instanceof Error ? reason.message : 'Unable to analyse this train.')
    } finally {
      if (searchGen.current === generation) {
        setAnalysingIds((cur) => {
          const next = new Set(cur)
          next.delete(trainId)
          return next
        })
      }
    }
  }

  const handleSearch = useCallback(async () => {
    if (!from || !to) {
      setError('Choose both a source and destination station first.')
      return
    }
    const generation = ++searchGen.current
    setSearching(true)
    setError('')
    setExpanded('')
    setAnalysingIds(new Set())

    try {
      const data = await railService.findTrains(from.code, to.code, date)
      if (searchGen.current !== generation) return
      setTrains(data.trains)
      setFrom(data.from)
      setTo(data.to)
      setHistoryDays(data.historyDays)
      setAutoAnalyseMax(data.autoAnalyseMax)
      setSearched(true)

      if (data.trains.length > 0 && data.trains.length <= data.autoAnalyseMax) {
        void (async () => {
          for (const train of data.trains) {
            if (searchGen.current !== generation) return
            await fillAnalysis(train.id, data.from.code, data.to.code, date, generation)
          }
        })()
      }
    } catch (reason) {
      if (searchGen.current !== generation) return
      setTrains([])
      setSearched(false)
      setError(reason instanceof Error ? reason.message : 'Unable to load trains.')
    } finally {
      if (searchGen.current === generation) setSearching(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, date])

  function swapStations() {
    if (from && to) {
      setFrom(to)
      setTo(from)
    }
  }

  async function toggleTrain(train: Train) {
    if (expanded === train.id) {
      setExpanded('')
      return
    }
    setExpanded(train.id)
    if (train.score !== null || analysingIds.has(train.id) || !from || !to) return
    await fillAnalysis(train.id, from.code, to.code, date, searchGen.current)
  }

  /** Called when URL state restores a previous search. */
  function restoreFromUrl(fromCode: string, toCode: string, urlDate: string) {
    setFrom({ code: fromCode, name: fromCode })
    setTo({ code: toCode, name: toCode })
    setDate(urlDate)
    // Trigger search on next tick after state is set
    setTimeout(() => {
      const gen = ++searchGen.current
      setSearching(true)
      setError('')
      railService
        .findTrains(fromCode, toCode, urlDate)
        .then((data) => {
          if (searchGen.current !== gen) return
          setTrains(data.trains)
          setFrom(data.from)
          setTo(data.to)
          setHistoryDays(data.historyDays)
          setAutoAnalyseMax(data.autoAnalyseMax)
          setSearched(true)
          if (data.trains.length > 0 && data.trains.length <= data.autoAnalyseMax) {
            void (async () => {
              for (const train of data.trains) {
                if (searchGen.current !== gen) return
                await fillAnalysis(train.id, data.from.code, data.to.code, urlDate, gen)
              }
            })()
          }
        })
        .catch((reason) => {
          if (searchGen.current !== gen) return
          setError(reason instanceof Error ? reason.message : 'Unable to load trains.')
        })
        .finally(() => {
          if (searchGen.current === gen) setSearching(false)
        })
    }, 0)
  }

  return {
    // State
    from, to, date, trains, filteredTrains, historyDays, autoAnalyseMax,
    searching, searched, error, expanded, analysingIds, sort, onlyReliable,
    timeFilter, scoring, liveNote,
    // Actions
    setFrom, setTo, setDate, setSort, setOnlyReliable, setTimeFilter,
    setError, handleSearch, swapStations, toggleTrain, restoreFromUrl,
  }
}

