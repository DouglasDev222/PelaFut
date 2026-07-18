import { cn } from "@/lib/utils"

/** Header cell for the compact stat tables — the abbreviation is spelled out
 * both in the `title` and in the legend under the table. Pass `onClick` to make
 * it a sort control; `active` bolds the column currently being sorted by. */
export function Th({
  abbr,
  label,
  onClick,
  active,
  className,
}: {
  abbr: string
  label: string
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  const content = (
    <abbr title={label} className="no-underline">
      {abbr}
    </abbr>
  )
  return (
    <th
      scope="col"
      title={label}
      aria-sort={active ? "descending" : undefined}
      className={cn(
        "w-9 px-1 py-1 text-right font-medium",
        active && "text-foreground",
        className
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={cn("w-full cursor-pointer text-right", active && "font-semibold")}
        >
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  )
}

export function Legend({ items }: { items: [string, string][] }) {
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
      {items.map(([abbr, label], i) => (
        <span key={abbr}>
          {i > 0 && " · "}
          <span className="font-medium text-foreground">{abbr}</span> = {label}
        </span>
      ))}
    </p>
  )
}
