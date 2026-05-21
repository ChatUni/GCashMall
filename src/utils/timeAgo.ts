const MINUTE = 60
const HOUR = 3600
const DAY = 86400
const MONTH = 2592000
const YEAR = 31536000

const intervals: [number, string, string][] = [
  [YEAR, 'year', 'years'],
  [MONTH, 'month', 'months'],
  [DAY, 'day', 'days'],
  [HOUR, 'hour', 'hours'],
  [MINUTE, 'min', 'mins'],
]

const validateDate = (date: string | Date): Date | null => {
  const d = typeof date === 'string' ? new Date(date) : date
  return isNaN(d.getTime()) ? null : d
}

const computeElapsedSeconds = (date: Date): number =>
  Math.floor((Date.now() - date.getTime()) / 1000)

const findInterval = (
  seconds: number,
): { value: number; unit: string } | null => {
  for (const [threshold, singular, plural] of intervals) {
    if (seconds >= threshold) {
      const value = Math.floor(seconds / threshold)
      return { value, unit: value === 1 ? singular : plural }
    }
  }
  return null
}

export const timeAgo = (date: string | Date): string => {
  const parsed = validateDate(date)
  if (!parsed) return ''

  const seconds = computeElapsedSeconds(parsed)
  if (seconds < 0) return 'just now'

  const interval = findInterval(seconds)
  if (!interval) return 'just now'

  return `${interval.value} ${interval.unit} ago`
}
