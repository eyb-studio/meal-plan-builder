import { Plus, Sparkles, Trash2, X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import type { MealCombo } from "~/lib/hooks"
import { itemsMacros, macrosForGrams, round, sumMacros } from "~/lib/macros"
import type { Food, FoodCategory, Meal } from "~/lib/types"
import { GramsControl, type GramsUpdater, stepForFood } from "./grams-control"

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
  /** Top combos historically used for this meal slot. Only honored when empty. */
  suggestions: MealCombo[]
  onApplySuggestion: (combo: MealCombo) => void
  onOpenPicker: () => void
  onRename: (name: string) => void
  onRemove: () => void
  onItemGramsChange: (itemId: string, grams: GramsUpdater) => void
  onItemRemove: (itemId: string) => void
}

export function MealCard({
  meal,
  foodById,
  active,
  suggestions,
  onApplySuggestion,
  onOpenPicker,
  onRename,
  onRemove,
  onItemGramsChange,
  onItemRemove,
}: Props) {
  const totals = itemsMacros(meal.items, foodById)
  const isEmpty = meal.items.length === 0

  // Filter each combo down to foods that still exist, then drop combos that
  // would render empty (e.g. all their custom foods got deleted).
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
      className={
        "rounded-lg border bg-card p-3 transition-colors " +
        (active ? "border-primary ring-2 ring-primary/30" : "")
      }
    >
      <div className="mb-1 flex items-center gap-2">
        <Input
          value={meal.name}
          onChange={(e) => onRename(e.target.value)}
          className="h-8 max-w-44 font-semibold"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          onClick={onRemove}
          title="Remove meal"
        >
          <Trash2 />
        </Button>
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
                    {/* Stacked emoji avatars */}
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
              return (
                <li
                  key={it.id}
                  className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="text-xl leading-none">
                      {food.emoji ?? CATEGORY_FALLBACK_EMOJI[food.category]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {food.name}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {round(m.calories)} kcal · P {round(m.protein, 1)} · C{" "}
                        {round(m.carbs, 1)} · F {round(m.fat, 1)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:self-auto">
                    <GramsControl
                      value={it.grams}
                      step={stepForFood(food.gramsPerUnit)}
                      onChange={(g) => onItemGramsChange(it.id, g)}
                      className="flex-1 sm:flex-initial"
                    />
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className="shrink-0"
                      onClick={() => onItemRemove(it.id)}
                      title="Remove item"
                    >
                      <X />
                    </Button>
                  </div>
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
