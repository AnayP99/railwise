/** Format an ISO date string as a short human-readable label (e.g. "Tue, 9 Sep"). */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`))
}

/** Format a delay in minutes as a human-readable string. */
export function formatDelay(minutes: number | null): string {
  if (minutes === null) return 'No data'
  if (minutes <= 5) return 'On time'
  return `${minutes} min late`
}

/** Today's date as an ISO string (YYYY-MM-DD). */
export const today = new Date().toISOString().slice(0, 10)

