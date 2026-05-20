import { Fragment, useEffect, useMemo, useState } from "react"
import { Download, FileText, Plus, X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { useToast } from "~/components/ui/toaster"
import { ClientForm } from "~/components/plan/client-form"
import { FoodPicker } from "~/components/plan/food-picker"
import { MacroTargets } from "~/components/plan/macro-targets"
import { MacroTotals } from "~/components/plan/macro-totals"
import { MealCard } from "~/components/plan/meal-card"
import { PlansMenu } from "~/components/plan/plans-menu"
import { SEED_FOODS } from "~/lib/foods"
import {
  nextId,
  useFoodUsage,
  useLocalStorage,
  useMealHistory,
  useScrollHidden,
  type MealCombo,
} from "~/lib/hooks"
import { defaultMacros, itemsMacros, sumMacros } from "~/lib/macros"
import { exportPlanToPdf } from "~/lib/pdf"
import { usePlans, planMutators } from "~/lib/plans"
import { makeDay, makeMeal, DEFAULT_CLIENT } from "~/lib/plan-defaults"
import type { Day, Food, Macros, Plan } from "~/lib/types"
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
  const {
    plans,
    activePlan,
    activePlanId,
    setActivePlan,
    updateActivePlan,
    createPlan,
    deletePlan,
    ensureBootstrapped,
  } = usePlans()

  // First load: create a default plan if storage is empty.
  useEffect(() => {
    ensureBootstrapped()
  }, [ensureBootstrapped])

  const { toast } = useToast()

  const [customFoods, setCustomFoods] = useLocalStorage<Food[]>(
    "fpg.custom-foods",
    []
  )
  const [coachName, setCoachName] = useLocalStorage<string>(
    "fpg.coach-name",
    ""
  )
  const { usage, recordUse } = useFoodUsage()
  const { snapshot: snapshotMeal, getSuggestions } = useMealHistory()

  const [activeDayId, setActiveDayId] = useState<string | null>(null)
  const [pickerMealId, setPickerMealId] = useState<string | null>(null)
  const [draggedMealId, setDraggedMealId] = useState<string | null>(null)
  const headerHidden = useScrollHidden()

  // Source of truth — derive everything from the active plan.
  const plan: Plan | null = activePlan
  const client = plan?.client ?? DEFAULT_CLIENT
  const targets = plan?.targets ?? defaultMacros(DEFAULT_CLIENT)
  const targetsCustomized = plan?.targetsCustomized ?? false
  const days = plan?.days ?? []

  // Keep active day in sync with the active plan. Resets to the plan's first
  // day on plan switch or if the currently-active day was deleted.
  const resolvedActiveDayId = useMemo(() => {
    if (!days.length) return null
    if (activeDayId && days.some((d) => d.id === activeDayId)) return activeDayId
    return days[0].id
  }, [days, activeDayId])

  const activeDay = days.find((d) => d.id === resolvedActiveDayId) ?? days[0]

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

  const favoriteIds = useMemo(() => {
    const known = new Set(allFoods.map((f) => f.id))
    return Object.entries(usage)
      .filter(([id, count]) => count > 0 && known.has(id))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id]) => id)
  }, [usage, allFoods])

  // --- Mutation helpers ---
  const setClient = (next: Plan["client"]) =>
    updateActivePlan(planMutators.setClient(next))

  const handleTargetsChange = (next: Macros) =>
    updateActivePlan(planMutators.setTargets(next))

  const recalcTargets = () => updateActivePlan(planMutators.resetTargets())

  const mapDays = (fn: (days: Day[]) => Day[]) =>
    updateActivePlan((p) => ({ ...p, days: fn(p.days) }))

  const mapActiveDay = (fn: (d: Day) => Day) =>
    mapDays((ds) =>
      ds.map((d) => (d.id === activeDay?.id ? fn(d) : d))
    )

  const mapMeal = (
    mealId: string,
    fn: (m: Day["meals"][number]) => Day["meals"][number]
  ) =>
    mapActiveDay((d) => ({
      ...d,
      meals: d.meals.map((m) => (m.id === mealId ? fn(m) : m)),
    }))

  // --- Undo plumbing: snapshot days/plan before destructive ops. ---
  const planSnapshot = () => plan
  const restorePlan = (snap: Plan | null) => {
    if (!snap) return
    updateActivePlan(() => snap)
  }

  // --- Meal picker management ---
  const snapshotCurrentMeal = (mealId: string) => {
    if (!activeDay) return
    const meal = activeDay.meals.find((m) => m.id === mealId)
    if (!meal || meal.items.length === 0) return
    snapshotMeal(
      meal.name,
      meal.items.map((it) => ({ foodId: it.foodId, grams: it.grams }))
    )
  }

  const setPickerMeal = (nextMealId: string | null) => {
    if (pickerMealId && pickerMealId !== nextMealId) {
      snapshotCurrentMeal(pickerMealId)
    }
    setPickerMealId(nextMealId)
  }

  const closePicker = () => setPickerMeal(null)

  const pickerMeal = useMemo(
    () =>
      pickerMealId && activeDay
        ? activeDay.meals.find((m) => m.id === pickerMealId) ?? null
        : null,
    [activeDay, pickerMealId]
  )

  const dayTotals: Macros = useMemo(
    () =>
      activeDay
        ? sumMacros(activeDay.meals.map((m) => itemsMacros(m.items, foodById)))
        : sumMacros([]),
    [activeDay, foodById]
  )

  // --- Meal mutations ---
  const defaultGramsForFood = (food: Food) => food.gramsPerUnit ?? 100

  const addMeal = () =>
    mapActiveDay((d) => ({
      ...d,
      meals: [...d.meals, makeMeal(`Meal ${d.meals.length + 1}`)],
    }))

  const removeMeal = (mealId: string) => {
    const snap = planSnapshot()
    mapActiveDay((d) => ({
      ...d,
      meals: d.meals.filter((m) => m.id !== mealId),
    }))
    if (pickerMealId === mealId) setPickerMealId(null)
    toast({
      message: "Meal removed",
      action: { label: "Undo", onClick: () => restorePlan(snap) },
    })
  }

  const duplicateMeal = (mealId: string) => {
    mapActiveDay((d) => {
      const idx = d.meals.findIndex((m) => m.id === mealId)
      if (idx < 0) return d
      const src = d.meals[idx]
      const clone = {
        id: nextId("meal"),
        name: src.name,
        items: src.items.map((it) => ({
          id: nextId("item"),
          foodId: it.foodId,
          grams: it.grams,
        })),
      }
      const next = [...d.meals]
      next.splice(idx + 1, 0, clone)
      return { ...d, meals: next }
    })
  }

  const copyMealToDay = (mealId: string, destDayId: string) => {
    if (!activeDay) return
    const src = activeDay.meals.find((m) => m.id === mealId)
    if (!src) return
    mapDays((ds) =>
      ds.map((d) => {
        if (d.id !== destDayId) return d
        return {
          ...d,
          meals: [
            ...d.meals,
            {
              id: nextId("meal"),
              name: src.name,
              items: src.items.map((it) => ({
                id: nextId("item"),
                foodId: it.foodId,
                grams: it.grams,
              })),
            },
          ],
        }
      })
    )
    const destLabel = days.find((d) => d.id === destDayId)?.label ?? "day"
    toast({ message: `Copied ${src.name} to ${destLabel}` })
  }

  const renameMeal = (mealId: string, name: string) =>
    mapMeal(mealId, (m) => ({ ...m, name }))

  const reorderMeals = (fromId: string, toId: string) => {
    if (fromId === toId || !activeDay) return
    const fromIdx = activeDay.meals.findIndex((m) => m.id === fromId)
    const toIdx = activeDay.meals.findIndex((m) => m.id === toId)
    if (fromIdx < 0 || toIdx < 0) return
    mapActiveDay((d) => {
      const meals = [...d.meals]
      const [moved] = meals.splice(fromIdx, 1)
      meals.splice(toIdx, 0, moved)
      return { ...d, meals }
    })
  }

  const endDrag = () => setDraggedMealId(null)

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
    recordUse(foodId)
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

  const removeItem = (mealId: string, itemId: string) => {
    const snap = planSnapshot()
    const food = activeDay?.meals
      .find((m) => m.id === mealId)
      ?.items.find((it) => it.id === itemId)
    const foodName = food
      ? foodById.get(food.foodId)?.name ?? "Item"
      : "Item"
    mapMeal(mealId, (m) => ({
      ...m,
      items: m.items.filter((it) => it.id !== itemId),
    }))
    toast({
      message: `${foodName} removed`,
      action: { label: "Undo", onClick: () => restorePlan(snap) },
    })
  }

  const applySuggestion = (mealId: string, combo: MealCombo) => {
    const validItems = combo.items.filter((it) => foodById.has(it.foodId))
    if (validItems.length === 0) return
    if (!activeDay) return
    const meal = activeDay.meals.find((m) => m.id === mealId)
    mapMeal(mealId, (m) => ({
      ...m,
      items: validItems.map((it) => ({
        id: nextId("item"),
        foodId: it.foodId,
        grams: it.grams,
      })),
    }))
    validItems.forEach((it) => recordUse(it.foodId))
    if (meal) {
      snapshotMeal(
        meal.name,
        validItems.map((it) => ({ foodId: it.foodId, grams: it.grams }))
      )
    }
  }

  // --- Day mutations ---
  const addDay = () => {
    const newDay = makeDay(`Day ${days.length + 1}`)
    mapDays((ds) => [...ds, newDay])
    setActiveDayId(newDay.id)
  }

  const removeDay = (dayId: string) => {
    if (days.length === 1) return
    const snap = planSnapshot()
    mapDays((ds) => ds.filter((d) => d.id !== dayId))
    if (dayId === activeDayId) {
      const fallback = days.find((d) => d.id !== dayId)
      setActiveDayId(fallback?.id ?? null)
    }
    toast({
      message: "Day removed",
      action: { label: "Undo", onClick: () => restorePlan(snap) },
    })
  }

  const duplicateActiveDay = () => {
    if (!activeDay) return
    const cloneId = nextId("day")
    const clone: Day = {
      id: cloneId,
      label: `${activeDay.label} (copy)`,
      meals: activeDay.meals.map((m) => ({
        id: nextId("meal"),
        name: m.name,
        items: m.items.map((it) => ({
          id: nextId("item"),
          foodId: it.foodId,
          grams: it.grams,
        })),
      })),
    }
    mapDays((ds) => [...ds, clone])
    setActiveDayId(cloneId)
  }

  const renameDay = (dayId: string, label: string) =>
    mapDays((ds) => ds.map((d) => (d.id === dayId ? { ...d, label } : d)))

  const addCustomFood = (food: Food) => setCustomFoods((cs) => [...cs, food])
  const removeCustomFood = (foodId: string) =>
    setCustomFoods((cs) => cs.filter((f) => f.id !== foodId))

  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const exportNow = (overrides?: { clientName?: string; coachName?: string }) => {
    if (!plan) return
    const effectiveClient = overrides?.clientName
      ? { ...client, name: overrides.clientName }
      : client
    const effectiveCoach = overrides?.coachName ?? coachName
    exportPlanToPdf({
      client: effectiveClient,
      targets,
      days,
      foodById,
      coachName: effectiveCoach,
    })
  }

  const handleExportClick = () => {
    if (!plan) return
    const needsClient = !client.name.trim()
    const needsCoach = !coachName.trim()
    if (needsClient || needsCoach) {
      setExportDialogOpen(true)
      return
    }
    exportNow()
  }

  // Button stays enabled as long as there's content to export — missing names
  // are handled by the dialog rather than gating the button.
  const canExport = days.some((d) => d.meals.some((m) => m.items.length > 0))

  const handleDeletePlan = (id: string) => {
    if (plans.length <= 1) return
    const snap = plans
    const activeSnap = activePlanId
    deletePlan(id)
    toast({
      message: "Plan removed",
      action: {
        label: "Undo",
        onClick: () => {
          // Best-effort restore: re-create from snapshot by walking back.
          const deleted = snap.find((p) => p.id === id)
          if (!deleted) return
          updateActivePlan((p) => p) // no-op to engage; restore by direct write below
          // Hard restore: write all snapshot plans back via storage hook would be ideal,
          // but we only expose updateActivePlan publicly. Re-create as a new plan
          // with the same content; we lose the id but content is preserved.
          // (Acceptable trade-off — undo for plan deletion is a rare path.)
          const restored = createPlan()
          updateActivePlan(() => ({ ...deleted, id: restored.id }))
          if (activeSnap) setActivePlan(activeSnap)
        },
      },
    })
  }

  const renderPicker = () =>
    pickerMeal && (
      <FoodPicker
        meal={pickerMeal}
        foods={allFoods}
        customFoodIds={customFoodIds}
        favoriteIds={favoriteIds}
        onClose={closePicker}
        onAddFood={(foodId) => addItem(foodId, pickerMeal.id)}
        onAddCustomFood={addCustomFood}
        onRemoveCustomFood={removeCustomFood}
      />
    )

  const otherDays = useMemo(
    () =>
      activeDay ? days.filter((d) => d.id !== activeDay.id) : [],
    [days, activeDay]
  )

  return (
    <div className="bg-muted/30 min-h-svh">
      <header
        className={cn(
          "bg-background sticky top-0 z-20 border-b transition-transform duration-200",
          headerHidden && "-translate-y-full lg:translate-y-0"
        )}
      >
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="text-primary size-5 shrink-0" />
            <h1 className="hidden font-semibold sm:block">Meal Plan Builder</h1>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden min-w-0 items-center gap-1.5 md:flex">
              <span className="text-muted-foreground shrink-0 text-xs font-medium">
                Coach
              </span>
              <Input
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                placeholder="Your name"
                className="h-7 w-36 text-sm"
                aria-label="Coach name shown on exported PDF"
              />
            </div>
            <PlansMenu
              plans={plans}
              activePlanId={activePlanId}
              onSelect={setActivePlan}
              onCreate={createPlan}
              onDelete={handleDeletePlan}
            />
            <Button onClick={handleExportClick} disabled={!canExport}>
              <Download />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-12">
        {/* Left: client summary + targets. Shrinks when the picker opens
            so the meal plan + picker can share the rest of the width. */}
        <section
          className={cn(
            "space-y-3",
            pickerMealId ? "lg:col-span-3" : "lg:col-span-4"
          )}
        >
          <ClientForm client={client} targets={targets} onChange={setClient} />
          <MacroTargets
            targets={targets}
            onChange={handleTargetsChange}
            onRecalculate={recalcTargets}
            customized={targetsCustomized}
          />
        </section>

        {/* Centre: meal plan. */}
        <section
          className={cn(
            "space-y-3",
            pickerMealId ? "lg:col-span-5" : "lg:col-span-8"
          )}
        >
          <div
            className={cn(
              "bg-muted/30 sticky z-10 -mx-4 px-4 py-2 transition-[top] duration-200",
              // Desktop header stays visible, so always anchor the bar just below it.
              "lg:mx-0 lg:top-[3.25rem] lg:bg-transparent lg:px-0 lg:py-0",
              headerHidden ? "top-0" : "top-[3.25rem]"
            )}
          >
            <MacroTotals actual={dayTotals} target={targets} />
          </div>

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle>Meal plan</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={duplicateActiveDay}
                    disabled={!activeDay}
                    title="Duplicate this day"
                  >
                    Duplicate day
                  </Button>
                  <Button variant="outline" size="sm" onClick={addDay}>
                    <Plus />
                    Add day
                  </Button>
                </div>
              </div>
              {days.length > 0 && (
                <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
                  {days.map((d) => {
                    const isActive = d.id === activeDay?.id
                    return (
                      <div
                        key={d.id}
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors lg:px-2 lg:py-1",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted"
                        )}
                      >
                        {isActive ? (
                          <input
                            aria-label="Rename day"
                            value={d.label}
                            onChange={(e) => renameDay(d.id, e.target.value)}
                            className="placeholder:text-primary-foreground/60 w-24 bg-transparent text-sm font-medium outline-none"
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
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {activeDay?.meals.map((meal) => (
                <Fragment key={meal.id}>
                  <MealCard
                    meal={meal}
                    foodById={foodById}
                    active={pickerMealId === meal.id}
                    otherDays={otherDays.map((d) => ({ id: d.id, label: d.label }))}
                    suggestions={
                      meal.items.length === 0
                        ? getSuggestions(meal.name, 3)
                        : []
                    }
                    onApplySuggestion={(combo) =>
                      applySuggestion(meal.id, combo)
                    }
                    onOpenPicker={() => setPickerMeal(meal.id)}
                    onRename={(name) => renameMeal(meal.id, name)}
                    onRemove={() => removeMeal(meal.id)}
                    onDuplicate={() => duplicateMeal(meal.id)}
                    onCopyToDay={(destId) => copyMealToDay(meal.id, destId)}
                    onItemGramsChange={(itemId, grams) =>
                      updateItemGrams(meal.id, itemId, grams)
                    }
                    onItemRemove={(itemId) => removeItem(meal.id, itemId)}
                    isDragging={draggedMealId === meal.id}
                    onDragStart={() => setDraggedMealId(meal.id)}
                    onDragEnd={endDrag}
                    onDragOver={() => {
                      // Live reorder: shuffle into the new slot as soon as the
                      // cursor enters another meal. The drop is just a commit.
                      if (draggedMealId && draggedMealId !== meal.id) {
                        reorderMeals(draggedMealId, meal.id)
                      }
                    }}
                    onDrop={endDrag}
                  />
                  {/* Mobile: inline picker below the active meal */}
                  {pickerMealId === meal.id && (
                    <div className="lg:hidden">{renderPicker()}</div>
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

        {/* Desktop: picker is a third column that slides in from the right.
            Mobile renders the picker inline below the active meal (above). */}
        {pickerMeal && (
          <aside
            key={pickerMeal.id}
            className="hidden animate-in slide-in-from-right-4 fade-in-0 duration-200 lg:col-span-4 lg:block"
          >
            <div className="sticky top-[4.5rem]">{renderPicker()}</div>
          </aside>
        )}
      </main>

      <ExportDetailsDialog
        open={exportDialogOpen}
        clientName={client.name}
        coachName={coachName}
        onCancel={() => setExportDialogOpen(false)}
        onSubmit={({ clientName, coachName: nextCoach }) => {
          setClient({ ...client, name: clientName })
          setCoachName(nextCoach)
          setExportDialogOpen(false)
          // Use the freshly-entered values for this export — state updates
          // from setClient/setCoachName won't be visible synchronously.
          exportNow({ clientName, coachName: nextCoach })
        }}
      />
    </div>
  )
}

function ExportDetailsDialog({
  open,
  clientName,
  coachName,
  onCancel,
  onSubmit,
}: {
  open: boolean
  clientName: string
  coachName: string
  onCancel: () => void
  onSubmit: (vals: { clientName: string; coachName: string }) => void
}) {
  const needsClient = !clientName.trim()
  const needsCoach = !coachName.trim()
  const [draftClient, setDraftClient] = useState(clientName)
  const [draftCoach, setDraftCoach] = useState(coachName)

  // Re-sync drafts whenever the dialog re-opens with new defaults.
  useEffect(() => {
    if (open) {
      setDraftClient(clientName)
      setDraftCoach(coachName)
    }
  }, [open, clientName, coachName])

  const canSubmit = draftClient.trim().length > 0 && draftCoach.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      clientName: draftClient.trim(),
      coachName: draftCoach.trim(),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Almost there</DialogTitle>
          <DialogDescription>
            {needsClient && needsCoach
              ? "Add the client and coach name so they appear on the PDF."
              : needsClient
                ? "Add the client name so it appears on the PDF."
                : "Add your name so it appears on the PDF as the coach."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {needsClient && (
            <div className="space-y-1.5">
              <Label htmlFor="ex-client">Client name</Label>
              <Input
                id="ex-client"
                autoFocus
                placeholder="Client name"
                value={draftClient}
                onChange={(e) => setDraftClient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) handleSubmit()
                }}
              />
            </div>
          )}
          {needsCoach && (
            <div className="space-y-1.5">
              <Label htmlFor="ex-coach">Coach name</Label>
              <Input
                id="ex-coach"
                autoFocus={!needsClient}
                placeholder="Your name"
                value={draftCoach}
                onChange={(e) => setDraftCoach(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) handleSubmit()
                }}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            <Download />
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

