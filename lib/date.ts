/**
 * Timezone-robust utilities to ensure calendar operations
 * are consistently aligned to India Standard Time (IST).
 */

export function getISTDateString(d: Date = new Date()): string {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' } as const
  const formatter = new Intl.DateTimeFormat('en-CA', options)
  return formatter.format(d) // returns "YYYY-MM-DD"
}

export function getISTTimeString(d: Date = new Date()): string {
  const options = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  } as const
  const formatter = new Intl.DateTimeFormat('en-US', options)
  return formatter.format(d) // returns "HH:MM:SS" (24-hour)
}
