import type { Activity, Client, Food, FoodItem, Goal, Macros } from "./types"

const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<Activity, string> = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Light (1-3 days/week)",
  moderate: "Moderate (3-5 days/week)",
  active: "Active (6-7 days/week)",
  very_active: "Very active (2x/day or hard labor)",
}

export const GOAL_LABELS: Record<Goal, string> = {
  cut: "Cut",
  maintain: "Maintain",
  bulk: "Bulk",
}

export function mifflinStJeor(c: Client): number {
  const base = 10 * c.weightKg + 6.25 * c.heightCm - 5 * c.age
  return c.gender === "male" ? base + 5 : base - 161
}

export function tdee(c: Client): number {
  return mifflinStJeor(c) * ACTIVITY_MULTIPLIER[c.activity]
}

// Coach can edit any of these. This is just the starting point.
export function defaultMacros(c: Client): Macros {
  const t = tdee(c)
  const calories =
    c.goal === "cut" ? t - 500 : c.goal === "bulk" ? t + 300 : t

  // Per-kg targets — standard hypertrophy heuristics.
  const proteinPerKg = c.goal === "cut" ? 2.2 : 2.0
  const fatPerKg = c.goal === "cut" ? 0.8 : 0.9

  const protein = c.weightKg * proteinPerKg
  const fat = c.weightKg * fatPerKg
  const carbsCalories = calories - protein * 4 - fat * 9
  const carbs = Math.max(0, carbsCalories / 4)

  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  }
}

export function macrosForGrams(food: Food, grams: number): Macros {
  const factor = grams / 100
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
  }
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

export function itemsMacros(
  items: FoodItem[],
  foodById: Map<string, Food>
): Macros {
  return sumMacros(
    items
      .map((it) => {
        const f = foodById.get(it.foodId)
        return f ? macrosForGrams(f, it.grams) : null
      })
      .filter((m): m is Macros => m !== null)
  )
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}
