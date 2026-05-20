import { cn } from "~/lib/utils"
import { round } from "~/lib/macros"
import type { Macros } from "~/lib/types"

type Props = {
  actual: Macros
  target: Macros
  size?: number
  strokeWidth?: number
  className?: string
}

/**
 * Three-arc donut. Arcs are sized by each macro's contribution to total kcal
 * eaten today, not by % of target. Center shows kcal: actual / target. The
 * arcs visualise macro balance; the surrounding bars track absolute targets.
 */
export function MacroDonut({
  actual,
  target,
  size = 112,
  strokeWidth = 10,
  className,
}: Props) {
  const proteinKcal = actual.protein * 4
  const carbsKcal = actual.carbs * 4
  const fatKcal = actual.fat * 9
  const macroKcal = proteinKcal + carbsKcal + fatKcal

  // Use macro-derived kcal for the arcs so total always lines up with arcs.
  // Use the user-tracked `actual.calories` for the centre — it's the value the
  // coach edits and trusts as "what the client ate".
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const arc = (kcal: number) =>
    macroKcal > 0 ? (kcal / macroKcal) * circumference : 0

  const proteinLen = arc(proteinKcal)
  const carbsLen = arc(carbsKcal)
  const fatLen = arc(fatKcal)

  // Offsets so the arcs sit end-to-end going clockwise from 12 o'clock.
  const carbsOffset = -proteinLen
  const fatOffset = -(proteinLen + carbsLen)

  const cx = size / 2
  const cy = size / 2

  const calsLabel = round(actual.calories)
  const targetCals = target.calories
  const pct = targetCals > 0 ? actual.calories / targetCals : 0
  const status =
    targetCals <= 0
      ? "text-muted-foreground"
      : pct >= 0.95 && pct <= 1.05
        ? "text-emerald-600"
        : pct > 1.1
          ? "text-red-600"
          : pct < 0.9
            ? "text-amber-600"
            : "text-sky-600"

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth={strokeWidth}
        />
        {macroKcal > 0 && (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-sky-500"
              strokeWidth={strokeWidth}
              strokeDasharray={`${proteinLen} ${circumference - proteinLen}`}
              strokeDashoffset={0}
              strokeLinecap="butt"
            />
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-amber-500"
              strokeWidth={strokeWidth}
              strokeDasharray={`${carbsLen} ${circumference - carbsLen}`}
              strokeDashoffset={carbsOffset}
              strokeLinecap="butt"
            />
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="currentColor"
              className="text-rose-500"
              strokeWidth={strokeWidth}
              strokeDasharray={`${fatLen} ${circumference - fatLen}`}
              strokeDashoffset={fatOffset}
              strokeLinecap="butt"
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-lg leading-none font-semibold tabular-nums", status)}>
          {calsLabel}
        </span>
        <span className="text-muted-foreground text-[10px] tabular-nums">
          / {targetCals} kcal
        </span>
      </div>
    </div>
  )
}
