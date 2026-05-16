import { Minus, Plus } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { cn } from "~/lib/utils"

export type GramsUpdater = number | ((prev: number) => number)

type Props = {
  value: number
  /** Increment/decrement step in grams. Defaults to 50. */
  step?: number
  /**
   * Receives either an absolute number (typed in the input) or a function of
   * the previous value (for +/- clicks). Pass the function form through to
   * setState so rapid clicks don't coalesce on stale closure values.
   */
  onChange: (value: GramsUpdater) => void
  className?: string
}

export function GramsControl({
  value,
  step = 50,
  onChange,
  className,
}: Props) {
  const dec = () => onChange((prev) => Math.max(0, prev - step))
  const inc = () => onChange((prev) => prev + step)

  const divider = <div className="bg-border self-stretch w-px" aria-hidden />

  return (
    <div
      className={cn(
        "bg-background flex items-center rounded-md border",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon-lg"
        className="rounded-r-none"
        onClick={dec}
        disabled={value <= 0}
        aria-label={`Decrease by ${step}g`}
        title={`-${step}g`}
      >
        <Minus />
      </Button>
      {divider}
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-9 min-w-14 flex-auto rounded-none border-0 px-1 text-center tabular-nums focus-visible:ring-0 sm:w-16 sm:flex-none"
      />
      {divider}
      <span className="text-muted-foreground px-3 py-1 text-sm">g</span>
      {divider}
      <Button
        variant="ghost"
        size="icon-lg"
        className="rounded-l-none"
        onClick={inc}
        aria-label={`Increase by ${step}g`}
        title={`+${step}g`}
      >
        <Plus />
      </Button>
    </div>
  )
}

/** Pick a sensible step for a food. Unit-based foods use the unit weight. */
export function stepForFood(gramsPerUnit?: number): number {
  return gramsPerUnit ?? 50
}
