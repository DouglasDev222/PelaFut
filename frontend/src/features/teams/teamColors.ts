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

export function colorForIndex(index: number) {
  return TEAM_COLORS[index % TEAM_COLORS.length]
}
