export const TEAM_COLORS = [
  { name: "Azul", hex: "#2563eb" },
  { name: "Amarelo", hex: "#eab308" },
  { name: "Vermelho", hex: "#dc2626" },
  { name: "Verde", hex: "#16a34a" },
  { name: "Preto", hex: "#171717" },
  { name: "Branco", hex: "#e5e7eb" },
  { name: "Laranja", hex: "#ea580c" },
  { name: "Roxo", hex: "#9333ea" },
]

/** "No color" — a transparent swatch, for teams that don't use a color bib. */
export const NO_COLOR = { name: "Sem cor", hex: "transparent" }

/** Colors offered in the picker (real colors + "Sem cor"). Defaults still only
 * use TEAM_COLORS, so a team is never auto-assigned "no color". */
export const PICKER_COLORS = [...TEAM_COLORS, NO_COLOR]

export function colorForIndex(index: number) {
  return TEAM_COLORS[index % TEAM_COLORS.length]
}
