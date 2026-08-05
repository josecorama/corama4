/**
 * Formats a monetary amount as US currency (e.g. 21600.0 -> "$21,600").
 * Values that are not numeric (e.g. "TBD", "Classified") are returned unchanged.
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  fallback = 'TBD'
): string {
  if (amount === null || amount === undefined || amount === '') return fallback

  const raw = String(amount).trim()
  const match = raw.match(/^\$?\s*(-?[\d,]*\.?\d+)\s*([KMB])?$/i)
  if (!match) return raw

  let value = parseFloat(match[1].replace(/,/g, ''))
  if (!Number.isFinite(value)) return raw

  const suffix = match[2]?.toUpperCase()
  if (suffix === 'K') value *= 1_000
  else if (suffix === 'M') value *= 1_000_000
  else if (suffix === 'B') value *= 1_000_000_000

  const hasCents = Math.abs(value % 1) > 0.004
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })
}
