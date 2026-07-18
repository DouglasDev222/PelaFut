export type StarFill = "empty" | "half" | "full"

/** Fill state of star `index` (1-based) for a rating that may end in .5 */
export function fillFor(value: number, index: number): StarFill {
  if (value >= index) return "full"
  if (value >= index - 0.5) return "half"
  return "empty"
}
