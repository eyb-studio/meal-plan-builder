import { jsPDF } from "jspdf"
import { itemsMacros, macrosForGrams, round } from "./macros"
import type { Client, Day, Food, Macros } from "./types"

const MARGIN_X = 14
const PAGE_W = 210 // A4 width in mm
const PAGE_H = 297

type Args = {
  client: Client
  targets: Macros
  days: Day[]
  foodById: Map<string, Food>
}

export function exportPlanToPdf({ client, targets, days, foodById }: Args) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  let y = 18

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > PAGE_H - 18) {
      doc.addPage()
      y = 18
    }
  }

  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("Meal Plan", MARGIN_X, y)
  y += 7
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  const subtitle = [
    client.name || "Client",
    `${client.weightKg}kg`,
    `${client.heightCm}cm`,
    `${client.age}y`,
    client.gender,
    goalLabel(client.goal),
  ].join(" · ")
  doc.text(subtitle, MARGIN_X, y)
  y += 8

  // Daily targets box
  doc.setDrawColor(220)
  doc.setFillColor(248, 248, 248)
  doc.roundedRect(MARGIN_X, y, PAGE_W - MARGIN_X * 2, 16, 2, 2, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Daily targets", MARGIN_X + 4, y + 5)
  doc.setFont("helvetica", "normal")
  const targetText = `${targets.calories} kcal   ·   Protein ${targets.protein}g   ·   Carbs ${targets.carbs}g   ·   Fat ${targets.fat}g`
  doc.text(targetText, MARGIN_X + 4, y + 12)
  y += 22

  days.forEach((day, idx) => {
    newPageIfNeeded(20)

    // Day header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(day.label, MARGIN_X, y)
    y += 6
    doc.setDrawColor(180)
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
    y += 5

    day.meals.forEach((meal) => {
      if (meal.items.length === 0) return
      newPageIfNeeded(14 + meal.items.length * 6)

      const totals = itemsMacros(meal.items, foodById)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.text(meal.name, MARGIN_X, y)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(110)
      const mealTotals = `${round(totals.calories)} kcal · P ${round(totals.protein)}g · C ${round(totals.carbs)}g · F ${round(totals.fat)}g`
      doc.text(mealTotals, PAGE_W - MARGIN_X, y, { align: "right" })
      doc.setTextColor(0)
      y += 5

      meal.items.forEach((it) => {
        const food = foodById.get(it.foodId)
        if (!food) return
        const m = macrosForGrams(food, it.grams)
        newPageIfNeeded(6)

        doc.setFontSize(10)
        const left = `${food.name} — ${it.grams}g`
        const right = `${round(m.calories)} kcal · P ${round(m.protein, 1)} · C ${round(m.carbs, 1)} · F ${round(m.fat, 1)}`
        doc.text(left, MARGIN_X + 2, y)
        doc.setTextColor(110)
        doc.text(right, PAGE_W - MARGIN_X, y, { align: "right" })
        doc.setTextColor(0)
        y += 5
      })

      y += 3
    })

    // Day totals
    const dayTotals = day.meals.reduce<Macros>(
      (acc, meal) => {
        const t = itemsMacros(meal.items, foodById)
        return {
          calories: acc.calories + t.calories,
          protein: acc.protein + t.protein,
          carbs: acc.carbs + t.carbs,
          fat: acc.fat + t.fat,
        }
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
    newPageIfNeeded(10)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Day total", MARGIN_X, y)
    doc.setFont("helvetica", "normal")
    const dayTotalText = `${round(dayTotals.calories)} kcal · P ${round(dayTotals.protein)}g · C ${round(dayTotals.carbs)}g · F ${round(dayTotals.fat)}g`
    doc.text(dayTotalText, PAGE_W - MARGIN_X, y, { align: "right" })
    y += 10

    if (idx < days.length - 1) {
      newPageIfNeeded(6)
    }
  })

  // Footer on every page
  const pages = doc.getNumberOfPages()
  doc.setFontSize(8)
  doc.setTextColor(150)
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.text(
      `Generated ${new Date().toLocaleDateString()}`,
      MARGIN_X,
      PAGE_H - 10
    )
    doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN_X, PAGE_H - 10, {
      align: "right",
    })
  }

  const filename = `${(client.name || "client").trim().replace(/\s+/g, "-").toLowerCase()}-meal-plan.pdf`
  doc.save(filename)
}

function goalLabel(g: Client["goal"]): string {
  return g.charAt(0).toUpperCase() + g.slice(1)
}
