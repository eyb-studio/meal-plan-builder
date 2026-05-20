import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Trash2, X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import type { Food, FoodCategory, Meal } from "~/lib/types"
import { cn } from "~/lib/utils"
import { AddCustomFoodDialog } from "./add-custom-food-dialog"

const ALL = "all" as const
type CategoryFilter = FoodCategory | typeof ALL

const TABS: Array<{ value: CategoryFilter; label: string; emoji: string }> = [
  { value: ALL, label: "All", emoji: "\u{1F37D}\u{FE0F}" },
  { value: "protein", label: "Protein", emoji: "\u{1F356}" },
  { value: "carb", label: "Carbs", emoji: "\u{1F35A}" },
  { value: "fat", label: "Fats", emoji: "\u{1F951}" },
  { value: "veg", label: "Veg", emoji: "\u{1F966}" },
  { value: "fruit", label: "Fruit", emoji: "\u{1F34E}" },
  { value: "supplement", label: "Supps", emoji: "\u{1F48A}" },
]

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
  foods: Food[]
  customFoodIds: Set<string>
  /** Food IDs ranked by usage; the picker shows the top few as quick-add chips. */
  favoriteIds: string[]
  onClose: () => void
  onAddFood: (foodId: string) => void
  onAddCustomFood: (food: Food) => void
  onRemoveCustomFood: (foodId: string) => void
  className?: string
  // When true, the picker constrains its own height (useful as a sticky desktop column).
  // When false, it grows with content (inline mobile use).
  selfScroll?: boolean
}

export function FoodPicker({
  meal,
  foods,
  customFoodIds,
  favoriteIds,
  onClose,
  onAddFood,
  onAddCustomFood,
  onRemoveCustomFood,
  className,
  selfScroll = true,
}: Props) {
  const [category, setCategory] = useState<CategoryFilter>(ALL)
  const [query, setQuery] = useState("")

  // Reset filters when switching meals.
  useEffect(() => {
    setQuery("")
    setCategory(ALL)
  }, [meal.id])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return foods.filter((f) => {
      if (category !== ALL && f.category !== category) return false
      if (q && !f.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [foods, category, query])

  // Resolve favorite IDs to Food objects, in the same order.
  const favoriteFoods = useMemo(() => {
    const byId = new Map(foods.map((f) => [f.id, f]))
    return favoriteIds
      .map((id) => byId.get(id))
      .filter((f): f is Food => Boolean(f))
      .slice(0, 8)
  }, [foods, favoriteIds])

  // Hide chips when filtering — they're meant as a fast start, not a competing list.
  const showChips =
    favoriteFoods.length > 0 && category === ALL && query.trim() === ""

  return (
    <div
      className={cn(
        "bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm",
        className
      )}
    >
      {/* Minimal header: title + close. Meal info lives in the meal card itself. */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <p className="text-sm font-semibold">Add food</p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close picker"
        >
          <X />
        </Button>
      </div>

      {/* Suggested foods (most-used) — one-tap chips */}
      {showChips && (
        <div className="border-b px-3 py-2.5">
          <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
            Suggested
          </p>
          <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1">
            {favoriteFoods.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onAddFood(f.id)}
                className="bg-muted hover:bg-muted/70 group flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                title={`Add ${f.name}`}
              >
                <span className="text-sm leading-none">
                  {f.emoji ?? CATEGORY_FALLBACK_EMOJI[f.category]}
                </span>
                <span className="max-w-[10rem] truncate">{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs + search */}
      <div className="space-y-2 border-b px-3 py-3">
        <Tabs
          value={category}
          onValueChange={(v) => setCategory(v as CategoryFilter)}
        >
          <TabsList className="!h-auto grid w-full grid-cols-7 gap-1 p-1">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="!h-auto flex flex-col gap-1 px-1 py-1.5 text-[11px] font-medium leading-none"
                title={t.label}
              >
                <span className="text-lg leading-none">{t.emoji}</span>
                <span className="leading-none">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search foods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Food list */}
      <div
        className={cn(
          selfScroll && "max-h-[28rem] overflow-y-auto",
          "flex-1"
        )}
      >
        {filtered.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            No foods match.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((f) => {
              const isCustom = customFoodIds.has(f.id)
              return (
                <li key={f.id} className="px-2">
                  <div className="hover:bg-muted/60 group flex items-center gap-3 rounded-md px-2 py-2">
                    <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full text-xl">
                      {f.emoji ?? CATEGORY_FALLBACK_EMOJI[f.category]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {f.calories} kcal · P {f.protein}g · C {f.carbs}g · F{" "}
                        {f.fat}g · per 100g
                      </p>
                    </div>
                    {isCustom && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveCustomFood(f.id)}
                        aria-label="Remove custom food"
                      >
                        <Trash2 />
                      </Button>
                    )}
                    <Button size="sm" onClick={() => onAddFood(f.id)}>
                      <Plus />
                      Add
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t bg-card px-3 py-3">
        <AddCustomFoodDialog onAdd={onAddCustomFood} />
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}
