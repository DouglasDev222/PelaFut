import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export interface BarDatum {
  label: string
  value: number
}

/** Single-series magnitude bar chart (goals per player/match) — one hue, no legend needed. */
export function GoalsBarChart({ data, valueLabel = "gols" }: { data: BarDatum[]; valueLabel?: string }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
  }

  const height = Math.max(120, data.length * 36)

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={110}
            tick={{ fill: "var(--foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(value) => [`${value} ${valueLabel}`, ""]}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Bar dataKey="value" fill="var(--chart-series-1)" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
