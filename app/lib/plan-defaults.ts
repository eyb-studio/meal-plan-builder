import type { Client, Day, Meal } from "./types"
import { nextId } from "./hooks"

export const DEFAULT_CLIENT: Client = {
  name: "",
  gender: "male",
  age: 28,
  heightCm: 178,
  weightKg: 80,
  activity: "moderate",
  goal: "cut",
}

export function makeMeal(name: string): Meal {
  return { id: nextId("meal"), name, items: [] }
}

export function makeDay(label: string): Day {
  return {
    id: nextId("day"),
    label,
    meals: [
      makeMeal("Meal 1"),
      makeMeal("Meal 2"),
      makeMeal("Meal 3"),
      makeMeal("Snack"),
    ],
  }
}
