import type { Food } from "./types"

/** Whether a food has unit-based serving info (1 egg = 50g etc.). */
export function hasUnit(food: Food): boolean {
  return Boolean(food.servingUnit && food.gramsPerUnit && food.gramsPerUnit > 0)
}

/**
 * Pretty unit count for a given grams amount. Returns "2 eggs", "1 scoop",
 * "1.5 scoops" etc. Returns null when the food has no unit definition.
 */
export function unitDisplay(food: Food, grams: number): string | null {
  if (!hasUnit(food)) return null
  const units = grams / food.gramsPerUnit!
  const pretty = formatUnits(units)
  const noun = pluralize(food.servingUnit!, units)
  return `${pretty} ${noun}`
}

function formatUnits(n: number): string {
  // Show 1 decimal only when it adds info.
  const rounded = Math.round(n * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function pluralize(noun: string, count: number): string {
  // Grams as a unit doesn't pluralize; everything else gets a naive "s".
  if (noun === "g" || noun === "ml") return noun
  if (count === 1) return noun
  if (noun.endsWith("y")) return noun.slice(0, -1) + "ies"
  if (noun.endsWith("s") || noun.endsWith("x")) return noun + "es"
  return noun + "s"
}
