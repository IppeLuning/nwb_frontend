// Code tables confirmed against the NWB attribute documentation (NDW docs).

export const WEGBEHSRT_LABELS: Record<string, string> = {
  R: 'Rijk',
  P: 'Provincie',
  G: 'Gemeente',
  W: 'Waterschap',
  T: 'Particulier',
}

export const RIJRICHTNG_LABELS: Record<string, string> = {
  H: 'Heen',
  T: 'Terug',
  B: 'Beide richtingen',
  O: 'Onbekend',
}

export function wegbehsrtLabel(code: string): string {
  return WEGBEHSRT_LABELS[code] ?? code
}

export function rijrichtngLabel(code: string): string {
  return RIJRICHTNG_LABELS[code] ?? code
}

export function formatLength(meters: number | null | undefined): string {
  if (meters == null) return '—'
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`
}

/** House-number range on one side of the road, e.g. "5–29" or "—" if unknown. */
export function formatHuisnummers(start: number | null, end: number | null): string {
  if (start == null && end == null) return '—'
  if (start == null) return `t/m ${end}`
  if (end == null) return `vanaf ${start}`
  return start === end ? `${start}` : `${start}–${end}`
}

export function formatRouteNumbers(props: {
  routenr: number | null
  routenr2: number | null
  routenr3: number | null
  routenr4: number | null
}): string {
  const numbers = [props.routenr, props.routenr2, props.routenr3, props.routenr4].filter(
    (n): n is number => n != null,
  )
  return numbers.length ? numbers.join(', ') : '—'
}
