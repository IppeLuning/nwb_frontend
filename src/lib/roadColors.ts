// Onderling goed te onderscheiden kleuren die leesbaar zijn op de lichte
// BRT-achtergrondkaart (die zelf grijs, geel en blauw gebruikt).
export const ROAD_COLORS = [
  '#1c7ed6', // blauw
  '#e8590c', // oranje
  '#2f9e44', // groen
  '#9c36b5', // paars
  '#c2255c', // roze
  '#0c8599', // teal
  '#a16207', // okergeel
  '#343a40', // donkergrijs
]

/** Kiest de eerste kleur die nog niet in gebruik is; daarna wordt er rondgedraaid. */
export function nextRoadColor(usedColors: string[]): string {
  const free = ROAD_COLORS.find((c) => !usedColors.includes(c))
  return free ?? ROAD_COLORS[usedColors.length % ROAD_COLORS.length]
}
