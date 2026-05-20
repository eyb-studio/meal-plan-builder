import { useEffect, useRef, useState } from "react"
import {
  Copy,
  GripVertical,
  MoreVertical,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import type { MealCombo } from "~/lib/hooks"
import { itemsMacros, macrosForGrams, round, sumMacros } from "~/lib/macros"
import type { Day, Food, FoodCategory, Meal } from "~/lib/types"
import { hasUnit, unitDisplay } from "~/lib/units"
import { cn } from "~/lib/utils"
import { GramsControl, type GramsUpdater } from "./grams-control"

const CATEGORY_FALLBACK_EMOJI: Record<FoodCategory, string> = {
  protein: "\u{1F356}",
  carb: "\u{1F35A}",
  fat: "\u{1F951}",
  veg: "\u{1F966}",
  fruit: "\u{1F34E}",
  supplement: "\u{1F48A}",
  other: "\u{1F37D}\u{FE0F}",
}

type Props = {
  meal: Meal
  foodById: Map<string, Food>
  active: boolean
  /** All days other than the meal's parent, used to populate "Copy to". */
  otherDays: Pick<Day, "id" | "label">[]
  /** Top combos historically used for this meal slot. Only honored when empty. */
  suggestions: MealCombo[]
  onApplySuggestion: (combo: MealCombo) => void
  onOpenPicker: () => void
  onRename: (name: string) => void
  onRemove: () => void
  onDuplicate: () => void
  onCopyToDay: (dayId: string) => void
  onItemGramsChange: (itemId: string, grams: GramsUpdater) => void
  onItemRemove: (itemId: string) => void
  /** Drag-to-reorder hooks. The grip on the header is the drag source;
   *  the whole card is the drop target. Reordering happens live in onDragOver. */
  isDragging?: boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  onDragOver?: () => void
  onDrop?: () => void
}

export function MealCard({
  meal,
  foodById,
  active,
  otherDays,
  suggestions,
  onApplySuggestion,
  onOpenPicker,
  onRename,
  onRemove,
  onDuplicate,
  onCopyToDay,
  onItemGramsChange,
  onItemRemove,
  isDragging,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  const totals = itemsMacros(meal.items, foodById)
  const isEmpty = meal.items.length === 0

  const validSuggestions: Array<MealCombo & { validItems: typeof suggestions[number]["items"] }> =
    suggestions
      .map((c) => ({
        ...c,
        validItems: c.items.filter((it) => foodById.has(it.foodId)),
      }))
      .filter((c) => c.validItems.length > 0)
  const hasSuggestions = isEmpty && validSuggestions.length > 0

  return (
    <div
      onDragOver={
        onDragOver
          ? (e) => {
              e.preventDefault()
              if (e.dataTransfer) e.dataTransfer.dropEffect = "move"
              onDragOver()
            }
          : undefined
      }
      onDrop={
        onDrop
          ? (e) => {
              e.preventDefault()
              onDrop()
            }
          : undefined
      }
      className={cn(
        "bg-card rounded-lg border p-3 transition-all",
        active && "border-primary ring-2 ring-primary/20",
        isDragging && "opacity-50"
      )}
    >
      <div className="mb-1 flex items-center gap-1">
        {onDragStart && (
          <span
            draggable
            onDragStart={(e) => {
              // Use plain text data so external apps don't choke on JSON.
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move"
                e.dataTransfer.setData("text/plain", meal.id)
              }
              onDragStart()
            }}
            onDragEnd={onDragEnd}
            className="text-muted-foreground hover:text-foreground -ml-1 flex size-7 cursor-grab items-center justify-center rounded transition-colors active:cursor-grabbing"
            title="Drag to reorder"
            aria-label="Drag to reorder meal"
          >
            <GripVertical className="size-4" />
          </span>
        )}
        <InlineEditableName value={meal.name} onChange={onRename} />
        <div className="ml-auto flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Meal actions">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy />
                Duplicate meal
              </DropdownMenuItem>
              {otherDays.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    <span className="inline-flex items-center gap-1.5">
                      <Send className="size-3" />
                      Copy to day
                    </span>
                  </DropdownMenuLabel>
                  {otherDays.map((d) => (
                    <DropdownMenuItem
                      key={d.id}
                      onSelect={() => onCopyToDay(d.id)}
                    >
                      {d.label}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                <Trash2 />
                Remove meal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="text-muted-foreground mb-2 text-xs tabular-nums">
        {round(totals.calories)} kcal · P {round(totals.protein)} · C{" "}
        {round(totals.carbs)} · F {round(totals.fat)}
      </div>

      {isEmpty ? (
        <div className="space-y-2">
          {hasSuggestions && (
            <>
              <div className="flex items-center gap-1.5 px-0.5">
                <Sparkles className="text-primary size-3.5" />
                <p className="text-muted-foreground text-xs font-medium">
                  Suggested for{" "}
                  <span className="text-foreground">{meal.name}</span>
                </p>
              </div>
              {validSuggestions.map((combo, i) => {
                const comboTotals = sumMacros(
                  combo.validItems.map((it) =>
                    macrosForGrams(foodById.get(it.foodId)!, it.grams)
                  )
                )
                return (
                  <div
                    key={i}
                    className="bg-primary/5 hover:bg-primary/10 border-primary/20 flex items-center gap-2 rounded-md border p-2 transition-colors"
                  >
                    <div className="flex shrink-0 items-center -space-x-1.5">
                      {combo.validItems.slice(0, 4).map((it) => {
                        const food = foodById.get(it.foodId)!
                        return (
                          <span
                            key={it.foodId}
                            className="bg-card ring-card flex size-7 items-center justify-center rounded-full text-sm ring-2"
                          >
                            {food.emoji ??
                              CATEGORY_FALLBACK_EMOJI[food.category]}
                          </span>
                        )
                      })}
                      {combo.validItems.length > 4 && (
                        <span className="bg-muted text-muted-foreground ring-card flex size-7 items-center justify-center rounded-full text-[10px] font-medium ring-2">
                          +{combo.validItems.length - 4}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {combo.validItems
                          .map((it) => foodById.get(it.foodId)!.name)
                          .join(" · ")}
                      </p>
                      <p className="text-muted-foreground text-[11px] tabular-nums">
                        {round(comboTotals.calories)} kcal · P{" "}
                        {round(comboTotals.protein)}g · used {combo.count}×
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0"
                      onClick={() => onApplySuggestion(combo)}
                    >
                      Use
                    </Button>
                  </div>
                )
              })}
            </>
          )}
          <button
            type="button"
            onClick={onOpenPicker}
            className="hover:bg-muted/60 hover:border-muted-foreground/40 flex w-full items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground transition-colors"
          >
            <Plus className="size-4" />
            {hasSuggestions ? "Or pick foods" : "Add food"}
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y">
            {meal.items.map((it) => {
              const food = foodById.get(it.foodId)
              if (!food) return null
              const m = macrosForGrams(food, it.grams)
              const unit = hasUnit(food) ? unitDisplay(food, it.grams) : null
              return (
                <li
                  key={it.id}
                  className="flex items-center gap-2 py-2"
                >
                  <span className="text-xl leading-none">
                    {food.emoji ?? CATEGORY_FALLBACK_EMOJI[food.category]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {food.name}
                      {unit && (
                        <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                          {unit}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {round(m.calories)} kcal · P {round(m.protein, 1)} · C{" "}
                      {round(m.carbs, 1)} · F {round(m.fat, 1)}
                    </p>
                  </div>
                  <GramsControl
                    food={food}
                    value={it.grams}
                    onChange={(g) => onItemGramsChange(it.id, g)}
                    className="shrink-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={() => onItemRemove(it.id)}
                    title="Remove item"
                    aria-label={`Remove ${food.name}`}
                  >
                    <X />
                  </Button>
                </li>
              )
            })}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={onOpenPicker}
          >
            <Plus />
            Add food
          </Button>
        </>
      )}
    </div>
  )
}

/**
 * Renders as a plain heading until clicked, then becomes an input. Keeps the
 * card visually calm but still single-click editable.
 */
function InlineEditableName({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync draft when the upstream value changes while not editing
  // (e.g. when a different meal is rendered into this slot).
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    const next = draft.trim() || value
    onChange(next)
    setDraft(next)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") {
            setDraft(value)
            setEditing(false)
          }
        }}
        className="bg-transparent text-sm font-semibold outline-none"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="hover:text-primary -ml-1 rounded px-1 text-left text-sm font-semibold transition-colors"
      title="Rename meal"
    >
      {value}
    </button>
  )
}
