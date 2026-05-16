import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Download, FileText, Plus, X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { ClientForm } from "~/components/plan/client-form"
import { FoodPicker } from "~/components/plan/food-picker"
import { MacroTargets } from "~/components/plan/macro-targets"
import { MacroTotals } from "~/components/plan/macro-totals"
import { MealCard } from "~/components/plan/meal-card"
import { SEED_FOODS } from "~/lib/foods"
import { nextId, useLocalStorage } from "~/lib/hooks"
import { GOAL_LABELS, defaultMacros, itemsMacros, sumMacros } from "~/lib/macros"
import { exportPlanToPdf } from "~/lib/pdf"
import { DEFAULT_CLIENT, makeDay, makeMeal } from "~/lib/plan-defaults"
import type { Client, Day, Food, Macros } from "~/lib/types"
import { cn } from "~/lib/utils"

export function meta() {
  return [
    { title: "Meal Plan Builder" },
    {
      name: "description",
      content: "Build macro-targeted meal plans for clients fast.",
    },
  ]
}

export default function Home() {
  const [client, setClient] = useState<Client>(DEFAULT_CLIENT)
  const [targets, setTargets] = useState<Macros>(() =>
    defaultMacros(DEFAULT_CLIENT)
  )
  const [targetsCustomized, setTargetsCustomized] = useState(false)
  const [days, setDays] = useState<Day[]>(() => [makeDay("Day 1")])
  const [activeDayId, setActiveDayId] = useState<string>(() => days[0].id)
  const [customFoods, setCustomFoods] = useLocalStorage<Food[]>(
    "fpg.custom-foods",
    []
  )

  // Picker state — which meal is currently being edited.
  const [pickerMealId, setPickerMealId] = useState<string | null>(null)

  // Mobile-only: collapse the client + targets section once the coach has filled it in.
  const [clientOpen, setClientOpen] = useState(true)

  // Recalculate targets when client data changes — unless the coach has overridden them.
  const prevClientRef = useRef(client)
  useEffect(() => {
    if (prevClientRef.current === client) return
    prevClientRef.current = client
    if (!targetsCustomized) {
      setTargets(defaultMacros(client))
    }
  }, [client, targetsCustomized])

  const handleTargetsChange = (next: Macros) => {
    setTargets(next)
    setTargetsCustomized(true)
  }

  const recalcTargets = () => {
    setTargets(defaultMacros(client))
    setTargetsCustomized(false)
  }

  const allFoods = useMemo<Food[]>(
    () => [...SEED_FOODS, ...customFoods],
    [customFoods]
  )
  const foodById = useMemo(
    () => new Map(allFoods.map((f) => [f.id, f])),
    [allFoods]
  )
  const customFoodIds = useMemo(
    () => new Set(customFoods.map((f) => f.id)),
    [customFoods]
  )

  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0]

  // Currently-edited meal. Resolved fresh from state so re-renders stay in sync.
  const pickerMeal = useMemo(
    () =>
      pickerMealId
        ? activeDay.meals.find((m) => m.id === pickerMealId) ?? null
        : null,
    [activeDay, pickerMealId]
  )

  const dayTotals: Macros = useMemo(
    () =>
      sumMacros(activeDay.meals.map((m) => itemsMacros(m.items, foodById))),
    [activeDay, foodById]
  )

  // --- Mutators (functional to stay safe under rapid clicks) ---
  const mapActiveDay = (fn: (d: Day) => Day) =>
    setDays((ds) => ds.map((d) => (d.id === activeDayId ? fn(d) : d)))

  const mapMeal = (
    mealId: string,
    fn: (m: Day["meals"][number]) => Day["meals"][number]
  ) =>
    mapActiveDay((d) => ({
      ...d,
      meals: d.meals.map((m) => (m.id === mealId ? fn(m) : m)),
    }))

  const addMeal = () =>
    mapActiveDay((d) => ({
      ...d,
      meals: [...d.meals, makeMeal(`Meal ${d.meals.length + 1}`)],
    }))

  const removeMeal = (mealId: string) => {
    mapActiveDay((d) => ({
      ...d,
      meals: d.meals.filter((m) => m.id !== mealId),
    }))
    if (pickerMealId === mealId) setPickerMealId(null)
  }

  const renameMeal = (mealId: string, name: string) =>
    mapMeal(mealId, (m) => ({ ...m, name }))

  const defaultGramsForFood = (food: Food) => food.gramsPerUnit ?? 100

  const addItem = (foodId: string, mealId: string) => {
    const food = foodById.get(foodId)
    if (!food) return
    mapMeal(mealId, (m) => ({
      ...m,
      items: [
        ...m.items,
        { id: nextId("item"), foodId, grams: defaultGramsForFood(food) },
      ],
    }))
  }

  const updateItemGrams = (
    mealId: string,
    itemId: string,
    grams: number | ((prev: number) => number)
  ) =>
    mapMeal(mealId, (m) => ({
      ...m,
      items: m.items.map((it) =>
        it.id === itemId
          ? {
              ...it,
              grams:
                typeof grams === "function" ? grams(it.grams) : grams,
            }
          : it
      ),
    }))

  const removeItem = (mealId: string, itemId: string) =>
    mapMeal(mealId, (m) => ({
      ...m,
      items: m.items.filter((it) => it.id !== itemId),
    }))

  const addDay = () => {
    const newDay = makeDay(`Day ${days.length + 1}`)
    setDays((ds) => [...ds, newDay])
    setActiveDayId(newDay.id)
  }

  const removeDay = (dayId: string) => {
    if (days.length === 1) return
    setDays((ds) => {
      const next = ds.filter((d) => d.id !== dayId)
      if (dayId === activeDayId) setActiveDayId(next[0].id)
      return next
    })
  }

  const renameDay = (dayId: string, label: string) =>
    setDays((ds) => ds.map((d) => (d.id === dayId ? { ...d, label } : d)))

  const addCustomFood = (food: Food) => setCustomFoods((cs) => [...cs, food])
  const removeCustomFood = (foodId: string) =>
    setCustomFoods((cs) => cs.filter((f) => f.id !== foodId))

  const handleExport = () => {
    exportPlanToPdf({ client, targets, days, foodById })
  }

  const canExport =
    client.name.trim().length > 0 &&
    days.some((d) => d.meals.some((m) => m.items.length > 0))

  // Two FoodPicker instances exist at once (desktop right column + mobile inline).
  // CSS hides whichever is off-layout; only the visible one is interactive.
  // State inside each (search/filter) is local; it's fine if they don't sync.
  const renderPicker = (selfScroll: boolean) =>
    pickerMeal && (
      <FoodPicker
        meal={pickerMeal}
        foods={allFoods}
        customFoodIds={customFoodIds}
        onClose={() => setPickerMealId(null)}
        onAddFood={(foodId) => addItem(foodId, pickerMeal.id)}
        onAddCustomFood={addCustomFood}
        onRemoveCustomFood={removeCustomFood}
        selfScroll={selfScroll}
      />
    )

  return (
    <div className="bg-muted/30 min-h-svh">
      <header className="bg-background sticky top-0 z-20 border-b">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="text-primary size-5" />
            <h1 className="font-semibold">Meal Plan Builder</h1>
          </div>
          <Button onClick={handleExport} disabled={!canExport}>
            <Download />
            Export PDF
          </Button>
        </div>
      </header>

      <main className="container mx-auto grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-12">
        {/* Left column: client + targets (collapsible on mobile) */}
        <section className="space-y-3 lg:col-span-3 lg:space-y-4">
          {/* Mobile-only collapse header with summary */}
          <button
            type="button"
            onClick={() => setClientOpen((o) => !o)}
            className="bg-card hover:bg-muted/40 flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors lg:hidden"
            aria-expanded={clientOpen}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {client.name.trim() || "Client details"}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {client.weightKg}kg · {client.heightCm}cm · {client.age}y ·{" "}
                {GOAL_LABELS[client.goal]} · {targets.calories} kcal
              </p>
            </div>
            <ChevronDown
              className={cn(
                "text-muted-foreground size-5 shrink-0 transition-transform",
                clientOpen && "rotate-180"
              )}
            />
          </button>

          {/* Form cards — always shown on desktop, toggled on mobile */}
          <div
            className={cn(
              "space-y-3 lg:!block lg:space-y-4",
              !clientOpen && "hidden"
            )}
          >
            <ClientForm client={client} onChange={setClient} />
            <MacroTargets
              targets={targets}
              onChange={handleTargetsChange}
              onRecalculate={recalcTargets}
              customized={targetsCustomized}
            />
          </div>
        </section>

        {/* Center column: meal plan */}
        <section className="space-y-3 lg:col-span-5">
          {/* Sticky macro totals on mobile, normal flow on desktop */}
          <div className="bg-muted/30 sticky top-[3.25rem] z-10 -mx-4 px-4 py-2 lg:static lg:bg-transparent lg:mx-0 lg:px-0 lg:py-0">
            <MacroTotals actual={dayTotals} target={targets} />
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle>Meal plan</CardTitle>
                <Button variant="outline" size="sm" onClick={addDay}>
                  <Plus />
                  Add day
                </Button>
              </div>
              <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
                {days.map((d) => {
                  const active = d.id === activeDayId
                  return (
                    <div
                      key={d.id}
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors lg:px-2 lg:py-1",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted"
                      )}
                    >
                      {active ? (
                        <input
                          aria-label="Rename day"
                          value={d.label}
                          onChange={(e) => renameDay(d.id, e.target.value)}
                          className="placeholder:text-primary-foreground/60 w-20 bg-transparent text-sm font-medium outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveDayId(d.id)}
                          className="font-medium"
                        >
                          {d.label}
                        </button>
                      )}
                      {days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDay(d.id)}
                          className="hover:bg-background/20 ml-1 rounded p-0.5"
                          title="Remove day"
                          aria-label={`Remove ${d.label}`}
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeDay.meals.map((meal) => (
                <Fragment key={meal.id}>
                  <MealCard
                    meal={meal}
                    foodById={foodById}
                    active={pickerMealId === meal.id}
                    onOpenPicker={() => setPickerMealId(meal.id)}
                    onRename={(name) => renameMeal(meal.id, name)}
                    onRemove={() => removeMeal(meal.id)}
                    onItemGramsChange={(itemId, grams) =>
                      updateItemGrams(meal.id, itemId, grams)
                    }
                    onItemRemove={(itemId) => removeItem(meal.id, itemId)}
                  />
                  {/* Mobile/tablet only: inline picker below the active meal */}
                  {pickerMealId === meal.id && (
                    <div className="lg:hidden">{renderPicker(false)}</div>
                  )}
                </Fragment>
              ))}
              <Button variant="outline" className="w-full" onClick={addMeal}>
                <Plus />
                Add meal
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Right column (desktop only): permanent picker slot */}
        <aside className="hidden lg:col-span-4 lg:block">
          <div className="sticky top-[4.5rem]">
            {pickerMeal ? (
              renderPicker(true)
            ) : (
              <Card>
                <CardContent className="text-muted-foreground p-8 text-center text-sm">
                  Click <span className="font-medium">Add food</span> on any
                  meal to start picking.
                </CardContent>
              </Card>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
