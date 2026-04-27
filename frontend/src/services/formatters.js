export const formatINR = (amount) => {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric) || numeric === 0) return 'Not specified'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numeric)
}

export const formatPct = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return `${Math.min(100, Math.max(0, Math.round(numeric)))}%`
}

export const maskAadhaar = (num) => (num ? `XXXX XXXX ${String(num).slice(-4)}` : '—')

export const maskPAN = (pan) => (pan ? `${String(pan).slice(0, 2)}***${String(pan).slice(-4)}` : '—')

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const timeAgo = (dateStr) => {
  if (!dateStr) return 'Never'
  const timestamp = new Date(dateStr).getTime()
  if (!Number.isFinite(timestamp)) return 'Never'

  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  return formatDate(dateStr)
}
