export type Station = { code: string; name: string; city?: string }

export type RouteStop = { station: string; time: string; day?: string; kind?: string }

export type RunDelay = { date: string | null; source: number | null; dest: number | null; cancelled?: boolean }

export type Train = {
  id: string
  name: string
  category: string
  departure: string
  arrival: string
  duration: string
  distance: string
  days: boolean[]
  score: number | null
  avgDelay: number | null
  avgSourceDelay: number | null
  onTime: number | null
  onTimeDepart: number | null
  cancelled: number
  sampleSize: number
  trend: 'improving' | 'steady' | 'worsening' | null
  stops: number
  history: RunDelay[]
  route: RouteStop[]
}

export const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
