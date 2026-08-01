import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(input: string | Date) {
  const date = typeof input === 'string' ? new Date(input) : input
  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  const divisions: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ]

  for (const [unit, seconds] of divisions) {
    if (Math.abs(deltaSeconds) >= seconds || unit === 'second') {
      return rtf.format(Math.round(deltaSeconds / seconds), unit)
    }
  }

  return 'just now'
}
