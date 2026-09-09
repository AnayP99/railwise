import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const app = express()
const port = Number(process.env.PORT ?? 8787)
const baseUrl = process.env.RAILRADAR_BASE_URL ?? 'https://api.railradar.in/v1'
const apiKey = process.env.RAILRADAR_API_KEY
const historyDays = clamp(Number(process.env.HISTORY_DAYS ?? 7), 3, 90)
const maxTrains = clamp(Number(process.env.MAX_TRAINS_PER_SEARCH ?? 20), 1, 20)
const autoAnalyseMax = clamp(Number(process.env.AUTO_ANALYSE_MAX ?? 3), 0, 10)
const requestsPerMinute = clamp(Number(process.env.PROVIDER_REQUESTS_PER_MINUTE ?? 10), 1, 60)
const MAX_CACHE_ENTRIES = 5000
const cacheFile = process.env.CACHE_FILE ?? path.join(process.cwd(), '.cache', 'provider.json')
const cache = new Map()
const inflight = new Map()
let persistTimer
let requestQueue = Promise.resolve()
let lastUpstreamRequestAt = 0
loadCache()

app.disable('x-powered-by')

app.use((request, response, next) => {
  const start = Date.now()
  response.on('finish', () => {
    const duration = Date.now() - start
    const status = response.statusCode
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO'
    console.log(`[${level}] ${request.method} ${request.path} ${status} ${duration}ms`)
  })
  next()
})

app.use((request, response, next) => {
  response.set('Access-Control-Allow-Origin', '*')
  response.set('Access-Control-Allow-Methods', 'GET')
  if (request.method === 'OPTIONS') return response.sendStatus(204)
  next()
})

app.get('/api/health', (_request, response) => {
  response.json({ configured: Boolean(apiKey), provider: 'RailRadar', historyDays, autoAnalyseMax, cacheEntries: cache.size })
})

app.get('/api/stations', async (request, response, next) => {
  try {
    const q = text(request.query.q)
    if (q.length < 2) return response.json({ stations: [] })
    const data = await provider(`/lookup/search/stations?q=${encodeURIComponent(q)}&limit=10`)
    response.json({ stations: Array.isArray(data.data) ? data.data.map(mapStation) : [] })
  } catch (error) { next(error) }
})

app.get('/api/trains', async (request, response, next) => {
  try {
    const from = text(request.query.from).toUpperCase()
    const to = text(request.query.to).toUpperCase()
    const date = text(request.query.date)
    if (!/^[A-Z0-9]{2,8}$/.test(from) || !/^[A-Z0-9]{2,8}$/.test(to) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return response.status(400).json({ error: { message: 'Enter valid station codes and a travel date.' } })
    }
    const between = await provider(`/trains/between/${from}/${to}?date=${date}`)
    const candidates = Array.isArray(between.data?.trains) ? between.data.trains.slice(0, maxTrains) : []
    const trains = candidates.map(buildSearchResult).filter(Boolean)
    response.json({
      from: mapStation(between.data?.from ?? { code: from, name: from }),
      to: mapStation(between.data?.to ?? { code: to, name: to }),
      trains: trains.filter(Boolean),
      historyDays,
      autoAnalyseMax,
    })
  } catch (error) { next(error) }
})

app.get('/api/trains/:number/analysis', async (request, response, next) => {
  try {
    const number = text(request.params.number)
    const from = text(request.query.from).toUpperCase()
    const to = text(request.query.to).toUpperCase()
    const date = text(request.query.date)
    if (!/^\d{5}$/.test(number) || !/^[A-Z0-9]{2,8}$/.test(from) || !/^[A-Z0-9]{2,8}$/.test(to) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return response.status(400).json({ error: { message: 'Invalid train, station, or travel date.' } })
    }
    response.json(await buildAnalysis(number, from, to, date))
  } catch (error) { next(error) }
})

function buildSearchResult(candidate) {
  const train = candidate.train ?? {}
  const number = text(train.number)
  if (!number) return null
  return {
    id: number, name: text(train.name) || `Train ${number}`, category: text(train.type) || 'Indian Railways',
    departure: text(candidate.from?.departure) || '—', arrival: text(candidate.to?.arrival) || '—',
    duration: minutesToText(Number(candidate.duration)), distance: numberToDistance(candidate.distance),
    days: mapRunDays(train.runDays), stops: Number(candidate.totalHaltsBetween ?? 0), route: [],
    score: null, avgDelay: null, avgSourceDelay: null, onTime: null, onTimeDepart: null, cancelled: 0, sampleSize: 0, trend: null, history: [],
  }
}

async function buildAnalysis(number, sourceCode, destinationCode, date) {
  // Fetch the timetable first so history sampling can skip days the train does not run.
  // RailRadar has no aggregated punctuality endpoint; dated live-status is the only source.
  const schedulePayload = await provider(`/trains/${number}?haltsOnly=true`)
  const schedule = schedulePayload.data
  const history = await collectHistory(number, sourceCode, destinationCode, date, schedule?.train?.runDays)
  const route = Array.isArray(schedule?.route) ? schedule.route : []
  const metrics = scoreHistory(history)
  return { route: compactRoute(route, sourceCode, destinationCode), ...metrics }
}

async function collectHistory(number, sourceCode, destinationCode, selectedDate, runDays) {
  // Generate up to 90 candidate dates respecting the scheduled run-days.
  // We do not cap to historyDays here — that cap is applied by the loop below so
  // that cancellations and 404s (days the train simply didn't operate) do not eat
  // into the quota of *actual observed* runs.
  const candidateDates = previousRunDates(selectedDate, runDays)
  const runs = []
  let observedRuns = 0
  for (const runDate of candidateDates) {
    if (observedRuns >= historyDays) break
    try {
      const payload = await provider(`/trains/${number}/live?date=${runDate}&haltsOnly=true`)
      const data = payload.data
      if (data?.status === 'cancelled') {
        // Record the cancellation for the penalty, but do NOT count it as an observed run.
        runs.push({ date: runDate, cancelled: true, source: null, dest: null })
        continue
      }
      const stops = Array.isArray(data?.route) ? data.route : []
      const sourceStop = stops.find((item) => text(item.stationCode).toUpperCase() === sourceCode)
      const destStop = stops.find((item) => text(item.stationCode).toUpperCase() === destinationCode)
      const source = haltDelay(sourceStop, 'depart')
      const dest = haltDelay(destStop, 'arrive')
      if (source !== null || dest !== null) {
        runs.push({ date: runDate, source, dest })
        observedRuns += 1
      }
      // If the API returned a valid response but neither stop had delay data,
      // the date is still skipped — it costs nothing from the quota.
    } catch { /* 404 = train didn't operate on this date; silently skip */ }
  }
  return runs
}

function haltDelay(stop, prefer) {
  if (!stop) return null
  const primary = prefer === 'depart' ? stop.delayDeparture : stop.delayArrival
  const fallback = prefer === 'depart' ? stop.delayArrival : stop.delayDeparture
  const delay = Number(primary ?? fallback)
  return Number.isFinite(delay) ? Math.max(0, delay) : null
}

function previousRunDates(selectedDate, runDays) {
  const active = mapRunDays(runDays)
  // Always sample backwards from yesterday IST at most — never from a future date.
  const yesterdayIST = new Date(Date.now() + 5.5 * HOUR - DAY)
  yesterdayIST.setUTCHours(0, 0, 0, 0)
  const selectedStart = new Date(`${selectedDate}T00:00:00Z`)
  const start = selectedStart < yesterdayIST ? selectedStart : yesterdayIST
  // Return ALL scheduled dates within the 90-day lookback window.
  // The caller decides when it has enough actual data.
  const dates = []
  for (let offset = 0; offset < 90; offset += 1) {
    const day = new Date(start)
    day.setUTCDate(start.getUTCDate() - offset)
    const weekday = day.getUTCDay()
    const index = weekday === 0 ? 6 : weekday - 1
    if (active[index]) dates.push(day.toISOString().slice(0, 10))
  }
  return dates
}

function mapRunDays(runDays) {
  const week = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  if (!Array.isArray(runDays) || runDays.length === 0) return week.map(() => true)
  if (typeof runDays[0] === 'boolean') return week.map((_, index) => Boolean(runDays[index]))
  const set = new Set(runDays.map((day) => String(day).toLowerCase().slice(0, 3)))
  return week.map((day) => set.has(day))
}

function scoreHistory(runs) {
  const destDelays = runs.map((run) => run.dest).filter((delay) => typeof delay === 'number')
  const sourceDelays = runs.map((run) => run.source).filter((delay) => typeof delay === 'number')
  const cancelled = runs.filter((run) => run.cancelled).length
  // Keep all runs (including cancelled) so the frontend table displays full history
  const history = runs.map((run) => ({
    date: run.date ?? null,
    source: run.source ?? null,
    dest: run.dest ?? null,
    cancelled: Boolean(run.cancelled),
  }))
  if (destDelays.length < 3) {
    return { score: null, avgDelay: null, avgSourceDelay: averageOrNull(sourceDelays), onTime: null, onTimeDepart: percentOnTime(sourceDelays), cancelled, sampleSize: destDelays.length, trend: null, history }
  }
  const average = Math.round(averageOf(destDelays))
  const onTime = percentOnTime(destDelays)
  const cancellationPenalty = Math.min(15, (cancelled / Math.max(runs.length, 1)) * 40)
  const score = clamp(Math.round(onTime * 0.72 + Math.max(0, 100 - average * 2) * 0.28 - cancellationPenalty), 0, 100)
  const pivot = Math.ceil(destDelays.length / 2)
  // Destination delays are collected newest-first. Compare recent arrival performance to older runs.
  const recent = averageOf(destDelays.slice(0, pivot)); const older = averageOf(destDelays.slice(pivot))
  const trend = recent < older - 5 ? 'improving' : recent > older + 5 ? 'worsening' : 'steady'
  return { score, avgDelay: average, avgSourceDelay: averageOrNull(sourceDelays), onTime, onTimeDepart: percentOnTime(sourceDelays), cancelled, sampleSize: destDelays.length, trend, history }
}

function percentOnTime(delays) {
  if (!delays.length) return null
  return Math.round((delays.filter((delay) => delay <= 15).length / delays.length) * 100)
}

function averageOrNull(values) {
  return values.length ? Math.round(averageOf(values)) : null
}

function compactRoute(route, sourceCode, destinationCode) {
  const sourceIndex = route.findIndex((stop) => text(stop.station?.code).toUpperCase() === sourceCode)
  const destinationIndex = route.findIndex((stop) => text(stop.station?.code).toUpperCase() === destinationCode)
  const segment = sourceIndex >= 0 && destinationIndex >= sourceIndex ? route.slice(sourceIndex, destinationIndex + 1) : []
  const picks = segment.length > 4 ? [segment[0], segment[Math.floor(segment.length / 3)], segment[Math.floor(segment.length * 2 / 3)], segment.at(-1)] : segment
  return picks.filter(Boolean).map((stop, index, array) => ({ station: text(stop.station?.name) || text(stop.stationCode), time: text(stop.departure) || text(stop.arrival) || '—', day: stop.departureDay ? `Day ${stop.departureDay}` : '', kind: index === 0 ? 'Departure' : index === array.length - 1 ? 'Arrival' : undefined }))
}

async function provider(requestPath, attempt = 0) {
  if (!apiKey) throw apiError(503, 'Railwise is not configured yet. Add RAILRADAR_API_KEY to .env to enable live data.')
  const cached = cache.get(requestPath)
  if (cached?.expiresAt > Date.now()) {
    if (cached.miss) throw apiError(cached.status ?? 404, cached.message ?? 'The rail-data provider did not return a result.')
    return cached.value
  }
  if (inflight.has(requestPath)) return inflight.get(requestPath)
  const job = fetchProvider(requestPath, attempt).finally(() => inflight.delete(requestPath))
  inflight.set(requestPath, job)
  return job
}

async function fetchProvider(requestPath, attempt) {
  await takeProviderSlot()
  const upstream = await fetch(`${baseUrl}${requestPath}`, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } })
  if (upstream.status === 429 && attempt < 1) {
    await upstream.arrayBuffer().catch(() => {})
    const retryAfter = Number(upstream.headers.get('retry-after'))
    const waitMs = (Number.isFinite(retryAfter) ? retryAfter : 60) * 1000
    await new Promise((resolve) => setTimeout(resolve, waitMs))
    return fetchProvider(requestPath, attempt + 1)
  }
  const body = await upstream.json().catch(() => ({}))
  if (!upstream.ok) {
    const message = body?.error?.message ?? 'The rail-data provider did not return a result.'
    if (upstream.status === 404 && shouldCacheMiss(requestPath)) {
      remember(requestPath, { miss: true, status: 404, message, expiresAt: Date.now() + DAY })
    }
    throw apiError(upstream.status, message)
  }
  remember(requestPath, { value: body, expiresAt: Date.now() + ttlFor(requestPath, body) })
  return body
}

function ttlFor(requestPath, body) {
  if (requestPath.includes('/trains/') && requestPath.includes('/live')) return liveStatusTtl(requestPath, body?.data)
  if (requestPath.includes('/lookup/search/stations')) return 6 * HOUR
  if (requestPath.includes('/trains/between/')) return HOUR
  if (/\/trains\/\d+/.test(requestPath)) return 24 * HOUR
  return HOUR
}

function liveStatusTtl(requestPath, data) {
  const date = new URLSearchParams(requestPath.split('?')[1] ?? '').get('date')
  const age = date ? istAgeDays(date) : 0
  const status = String(data?.status ?? '').toLowerCase()
  if (status === 'cancelled' && age >= 1) return 30 * DAY
  if (age >= 2) return status === 'running' ? 6 * HOUR : 30 * DAY
  if (journeySettled(data) && age >= 1) return 14 * DAY
  if (age >= 1) return 15 * 60 * 1000
  return 2 * 60 * 1000
}

function journeySettled(data) {
  const status = String(data?.status ?? '').toLowerCase()
  if (['cancelled', 'completed', 'terminated', 'arrived'].includes(status)) return true
  const route = Array.isArray(data?.route) ? data.route : []
  const lastHalt = [...route].reverse().find((stop) => stop?.isHalt !== false)
  const haltStatus = String(lastHalt?.status ?? '').toLowerCase()
  return Boolean(lastHalt?.actualArrival) || ['arrived', 'completed', 'terminated'].includes(haltStatus)
}

function shouldCacheMiss(requestPath) {
  if (!requestPath.includes('/live')) return false
  const date = new URLSearchParams(requestPath.split('?')[1] ?? '').get('date')
  return Boolean(date) && istAgeDays(date) >= 1
}

function istToday() {
  return new Date(Date.now() + 5.5 * HOUR).toISOString().slice(0, 10)
}

function istAgeDays(ymd) {
  const start = Date.parse(`${ymd}T00:00:00Z`)
  const today = Date.parse(`${istToday()}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(today)) return 0
  return Math.round((today - start) / DAY)
}

function remember(key, entry) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
  cache.set(key, entry)
  persistCache()
}

function loadCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    const now = Date.now()
    for (const [key, entry] of Object.entries(parsed.entries ?? {})) {
      if (entry?.expiresAt > now) cache.set(key, entry)
    }
  } catch { /* first run, or an unreadable cache file */ }
}

function persistCache() {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    try {
      const now = Date.now()
      const entries = {}
      for (const [key, entry] of cache) {
        if (entry?.expiresAt > now) entries[key] = entry
        else cache.delete(key)
      }
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
      const tmp = `${cacheFile}.${process.pid}.tmp`
      fs.writeFileSync(tmp, JSON.stringify({ savedAt: new Date().toISOString(), entries }))
      fs.renameSync(tmp, cacheFile)
    } catch (error) {
      console.error('Failed to persist cache:', error.message)
    }
  }, 400)
}

async function takeProviderSlot() {
  let release
  const previous = requestQueue
  requestQueue = new Promise((resolve) => { release = resolve })
  await previous
  const interval = Math.ceil(60_000 / requestsPerMinute)
  const wait = Math.max(0, lastUpstreamRequestAt + interval - Date.now())
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
  lastUpstreamRequestAt = Date.now()
  release()
}

function mapStation(station) { return { code: text(station?.code), name: text(station?.name) || text(station?.code), city: text(station?.city) || undefined } }
function text(value) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}
function clamp(value, min, max) { return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max) }
function numberToDistance(value) { const number = Number(value); return Number.isFinite(number) ? `${Math.round(number).toLocaleString('en-IN')} km` : 'Distance unavailable' }
function minutesToText(value) { if (!Number.isFinite(value) || value < 1) return 'Duration unavailable'; return `${Math.floor(value / 60)}h ${Math.round(value % 60)}m` }
function averageOf(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 }
function apiError(status, message) { const error = new Error(message); error.status = status; return error }

app.use((error, _request, response, _next) => { console.error(error.message); response.status(error.status ?? 500).json({ error: { message: error.message ?? 'Unexpected server error.' } }) })

function shutdown() {
  console.log('Shutting down gracefully...')
  clearTimeout(persistTimer)
  try {
    const now = Date.now()
    const entries = {}
    for (const [key, entry] of cache) {
      if (entry?.expiresAt > now) entries[key] = entry
    }
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
    fs.writeFileSync(cacheFile, JSON.stringify({ savedAt: new Date().toISOString(), entries }))
    console.log(`Cache saved (${Object.keys(entries).length} entries).`)
  } catch (error) {
    console.error('Failed to save cache on shutdown:', error.message)
  }
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

app.listen(port, () => console.log(`Railwise API listening on http://localhost:${port}`))
