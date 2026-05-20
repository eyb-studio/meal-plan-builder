export type Gender = "male" | "female"
export type Activity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active"
export type Goal = "cut" | "maintain" | "bulk"

export type Client = {
  name: string
  gender: Gender
  age: number
  heightCm: number
  weightKg: number
  activity: Activity
  goal: Goal
}

export type Macros = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type FoodCategory =
  | "protein"
  | "carb"
  | "fat"
  | "veg"
  | "fruit"
  | "supplement"
  | "other"

// Nutrition values are per 100g (or per unit when servingUnit is provided).
export type Food = {
  id: string
  name: string
  category: FoodCategory
  calories: number
  protein: number
  carbs: number
  fat: number
  // Single emoji shown in the picker. Coach can omit on custom foods.
  emoji?: string
  // Optional unit-based serving (e.g. "egg", "scoop"). Grams logic still applies when undefined.
  servingUnit?: string
  gramsPerUnit?: number
}

export type FoodItem = {
  id: string
  foodId: string
  grams: number
}

export type Meal = {
  id: string
  name: string
  items: FoodItem[]
}

export type Day = {
  id: string
  label: string
  meals: Meal[]
}

export type Plan = {
  id: string
  client: Client
  targets: Macros
  /** True once the coach has manually edited targets; freezes auto-recalc. */
  targetsCustomized: boolean
  days: Day[]
  createdAt: number
  updatedAt: number
}
