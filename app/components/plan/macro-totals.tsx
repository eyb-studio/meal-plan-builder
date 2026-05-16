import { cn } from "~/lib/utils"
import type { Macros } from "~/lib/types"
import { round } from "~/lib/macros"

type Props = {
  actual: Macros
  target: Macros
  className?: string
}

const KEYS: Array<{ key: keyof Macros; label: string; unit: string }> = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
]

// Color the bar by how close actual is to the target. Within 5% is good,
// over by more than 10% is too high, under by more than 10% is too low.
function statusColor(actual: number, target: number): string {
  if (target <= 0) return "bg-muted-foreground"
  const pct = actual / target
  if (pct >= 0.95 && pct <= 1.05) return "bg-emerald-500"
  if (pct > 1.1) return "bg-red-500"
  if (pct < 0.9) return "bg-amber-500"
  return "bg-sky-500"
}

export function MacroTotals({ actual, target, className }: Props) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 rounded-lg border bg-card p-3 sm:grid-cols-4",
        className
      )}
    >
      {KEYS.map(({ key, label, unit }) => {
        const a = actual[key]
        const t = target[key]
        const pct = t > 0 ? Math.min(100, (a / t) * 100) : 0
        return (
          <div key={key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                {label}
              </span>
              <span className="text-xs tabular-nums">
                <span className="font-semibold">{round(a)}</span>
                <span className="text-muted-foreground"> / {t} {unit}</span>
              </span>
            </div>
            <div className="bg-muted mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={cn("h-full rounded-full transition-all", statusColor(a, t))}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
