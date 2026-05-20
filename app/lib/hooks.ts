import { useEffect, useMemo, useState } from "react"

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value])

  return [value, setValue] as const
}

let idCounter = 0
export function nextId(prefix = "id"): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

/**
 * Returns `true` while the user is scrolling DOWN past the threshold,
 * `false` while scrolling up or near the top. Use this to hide a header
 * to reclaim mobile real estate. SSR-safe (defaults to false).
 */
export function useScrollHidden(threshold = 80, tolerance = 4): boolean {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    let lastScroll = window.scrollY
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const current = window.scrollY
        if (current <= threshold) {
          setHidden(false)
          lastScroll = current
        } else if (current > lastScroll + tolerance) {
          setHidden(true)
          lastScroll = current
        } else if (current < lastScroll - tolerance) {
          setHidden(false)
          lastScroll = current
        }
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [threshold, tolerance])
  return hidden
}

export type MealSnapshotItem = { foodId: string; grams: number }

/** A distinct combination of foods used for a meal slot, ranked by frequency. */
export type MealCombo = {
  items: MealSnapshotItem[]
  count: number
  updatedAt: number
}

// Kept as an alias so external code can refer to a single combo as a snapshot.
export type MealSnapshot = MealCombo

const MEAL_HISTORY_KEY = "fpg.meal-history"
const MAX_COMBOS_PER_MEAL = 10

/** Two combos are "the same" if they contain the same set of food IDs. */
function comboKey(items: MealSnapshotItem[]): string {
  return items
    .map((it) => it.foodId)
    .slice()
    .sort()
    .join("|")
}

/**
 * Normalises whatever's in localStorage to the new shape. Tolerates the older
 * `Record<name, {items, updatedAt}>` single-snapshot format.
 */
function migrateHistory(raw: unknown): Record<string, MealCombo[]> {
  if (!raw || typeof raw !== "object") return {}
  const out: Record<string, MealCombo[]> = {}
  for (const [name, val] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      out[name] = val.filter(
        (c): c is MealCombo =>
          !!c &&
          typeof c === "object" &&
          Array.isArray((c as MealCombo).items) &&
          typeof (c as MealCombo).count === "number"
      )
    } else if (val && typeof val === "object" && "items" in (val as object)) {
      const snap = val as { items: MealSnapshotItem[]; updatedAt?: number }
      if (Array.isArray(snap.items) && snap.items.length > 0) {
        out[name] = [
          {
            items: snap.items,
            count: 1,
            updatedAt: snap.updatedAt ?? Date.now(),
          },
        ]
      }
    }
  }
  return out
}

/**
 * Per-meal-slot history. Tracks multiple distinct combos per meal name and
 * ranks them by usage count so the empty-meal UI can offer the coach's most
 * frequent setups as one-tap options.
 */
export function useMealHistory() {
  const [raw, setRaw] = useLocalStorage<Record<string, unknown>>(
    MEAL_HISTORY_KEY,
    {}
  )

  // Migration runs every read; cheap and keeps the rest of the API simple.
  const history = useMemo(() => migrateHistory(raw), [raw])

  const key = (name: string) => name.trim().toLowerCase()

  /**
   * Records a meal's items. If the same food set has been used before, bumps
   * its count and updates grams to the latest values. Otherwise adds a new
   * combo. Empties are ignored.
   */
  const snapshot = (mealName: string, items: MealSnapshotItem[]) => {
    const k = key(mealName)
    if (!k || items.length === 0) return
    const now = Date.now()
    const ck = comboKey(items)
    setRaw((current) => {
      const migrated = migrateHistory(current)
      const combos = migrated[k] ?? []
      const idx = combos.findIndex((c) => comboKey(c.items) === ck)
      let next: MealCombo[]
      if (idx >= 0) {
        next = [...combos]
        next[idx] = {
          items: items.map((it) => ({ foodId: it.foodId, grams: it.grams })),
          count: combos[idx].count + 1,
          updatedAt: now,
        }
      } else {
        next = [
          ...combos,
          {
            items: items.map((it) => ({ foodId: it.foodId, grams: it.grams })),
            count: 1,
            updatedAt: now,
          },
        ]
      }
      next.sort((a, b) => b.count - a.count || b.updatedAt - a.updatedAt)
      return { ...migrated, [k]: next.slice(0, MAX_COMBOS_PER_MEAL) }
    })
  }

  /** Top-N combos for a meal name, most-used first. Empty array if none. */
  const getSuggestions = (mealName: string, limit = 3): MealCombo[] =>
    (history[key(mealName)] ?? []).slice(0, limit)

  return { history, snapshot, getSuggestions }
}

/**
 * Per-food usage counter stored in localStorage. Records every time the coach
 * adds a food to a meal; exposes a sorted list of the most-used food IDs so the
 * picker can surface them as one-tap chips.
 */
export function useFoodUsage() {
  const [usage, setUsage] = useLocalStorage<Record<string, number>>(
    "fpg.food-usage",
    {}
  )

  const recordUse = (foodId: string) => {
    setUsage((u) => ({ ...u, [foodId]: (u[foodId] ?? 0) + 1 }))
  }

  const clear = () => setUsage({})

  return { usage, recordUse, clear }
}

// SSR-safe media query subscription.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)
    update()
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [query])
  return matches
}
