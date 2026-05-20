import { cn } from "~/lib/utils"
import type { Macros } from "~/lib/types"
import { round } from "~/lib/macros"
import { MacroDonut } from "./macro-donut"

type Props = {
  actual: Macros
  target: Macros
  className?: string
}

type Row = {
  key: "protein" | "carbs" | "fat"
  label: string
  shortLabel: string
  color: string
  dotColor: string
}

const ROWS: Row[] = [
  { key: "protein", label: "Protein", shortLabel: "P", color: "bg-sky-500", dotColor: "bg-sky-500" },
  { key: "carbs", label: "Carbs", shortLabel: "C", color: "bg-amber-500", dotColor: "bg-amber-500" },
  { key: "fat", label: "Fat", shortLabel: "F", color: "bg-rose-500", dotColor: "bg-rose-500" },
]

export function MacroTotals({ actual, target, className }: Props) {
  return (
    <div
      className={cn(
        "bg-card flex items-center gap-4 rounded-lg border p-3",
        className
      )}
    >
      <MacroDonut actual={actual} target={target} size={104} strokeWidth={10} />
      <div className="grid flex-1 grid-cols-1 gap-2.5">
        {ROWS.map((row) => {
          const a = actual[row.key]
          const t = target[row.key]
          const pct = t > 0 ? Math.min(100, (a / t) * 100) : 0
          return (
            <div key={row.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", row.dotColor)} />
                  <span className="text-xs font-medium">{row.label}</span>
                </div>
                <span className="text-xs tabular-nums">
                  <span className="font-semibold">{round(a)}</span>
                  <span className="text-muted-foreground"> / {t} g</span>
                </span>
              </div>
              <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={cn("h-full rounded-full transition-all", row.color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
