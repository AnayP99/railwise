import type { Station, Train } from './trainData'

type ApiError = { error?: { message?: string } }

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`)
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiError
    throw new Error(body.error?.message ?? 'Unable to retrieve railway data.')
  }
  return response.json() as Promise<T>
}

export const railService = {
  async searchStations(query: string): Promise<Station[]> {
    if (query.trim().length < 2) return []
    const data = await request<{ stations: Station[] }>(`/stations?q=${encodeURIComponent(query)}`)
    return data.stations
  },
  async findTrains(from: string, to: string, date: string): Promise<{ trains: Train[]; from: Station; to: Station; historyDays: number; autoAnalyseMax: number }> {
    return request(`/trains?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`)
  },
  async analyseTrain(number: string, from: string, to: string, date: string): Promise<Partial<Train>> {
    return request(`/trains/${encodeURIComponent(number)}/analysis?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`)
  },
}
