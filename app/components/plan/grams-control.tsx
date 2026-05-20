import { useEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "~/components/ui/button"
import { hasUnit } from "~/lib/units"
import { cn } from "~/lib/utils"
import type { Food } from "~/lib/types"

export type GramsUpdater = number | ((prev: number) => number)

type Props = {
  food: Food
  value: number
  onChange: (value: GramsUpdater) => void
  className?: string
}

/**
 * Compact grams control. Renders as `[–] value [+]` where the middle is
 * tap-to-edit. For unit-based foods (eggs, scoops) the stepper increments
 * by one unit; otherwise it steps by 50g.
 */
export function GramsControl({ food, value, onChange, className }: Props) {
  const step = stepForFood(food)
  const unit = hasUnit(food)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed >= 0) {
      const grams = unit ? parsed * food.gramsPerUnit! : parsed
      onChange(Math.round(grams))
    }
    setEditing(false)
  }

  const startEdit = () => {
    setDraft(unit ? formatUnits(value / food.gramsPerUnit!) : String(value))
    setEditing(true)
  }

  const dec = () => onChange((prev) => Math.max(0, prev - step))
  const inc = () => onChange((prev) => prev + step)

  const display = unit
    ? `${formatUnits(value / food.gramsPerUnit!)} × ${food.servingUnit}`
    : `${value} g`

  return (
    <div
      className={cn(
        "bg-background inline-flex items-center rounded-full border",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        onClick={dec}
        disabled={value <= 0}
        aria-label={unit ? `-1 ${food.servingUnit}` : `-${step}g`}
      >
        <Minus />
      </Button>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          inputMode="decimal"
          className="w-16 bg-transparent text-center text-sm tabular-nums outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="hover:text-foreground min-w-16 px-1.5 text-center text-sm tabular-nums transition-colors"
          title="Tap to edit"
        >
          {display}
        </button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full"
        onClick={inc}
        aria-label={unit ? `+1 ${food.servingUnit}` : `+${step}g`}
      >
        <Plus />
      </Button>
    </div>
  )
}

function stepForFood(food: Food): number {
  return food.gramsPerUnit ?? 50
}

function formatUnits(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
