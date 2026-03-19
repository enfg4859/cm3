export function formatCurrency(value: number, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(value);
}

export function formatCompactNumber(value: number, locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatSignedCurrency(value: number, currency = 'USD') {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCurrency(value, currency)}`;
}

export function formatTimestamp(timestamp: number, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(timestamp * 1000));
}

export function formatShortDate(timestamp: number, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric'
  }).format(new Date(timestamp * 1000));
}
