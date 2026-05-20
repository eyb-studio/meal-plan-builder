import { jsPDF } from "jspdf"
import { itemsMacros, macrosForGrams, round } from "./macros"
import { hasUnit, unitDisplay } from "./units"
import type { Client, Day, Food, Macros, Meal } from "./types"

// All units in millimetres — jsPDF default for A4.
const PAGE_W = 210
const PAGE_H = 297
const MARGIN_X = 16
const MARGIN_TOP = 18
const MARGIN_BOTTOM = 14
const CONTENT_W = PAGE_W - MARGIN_X * 2

// Palette (RGB triples).
const C = {
  brandDark: [30, 41, 59] as const, // slate-800
  brandText: [255, 255, 255] as const,
  text: [15, 23, 42] as const, // slate-900
  subtle: [100, 116, 139] as const, // slate-500
  border: [226, 232, 240] as const, // slate-200
  borderStrong: [203, 213, 225] as const, // slate-300
  surface: [248, 250, 252] as const, // slate-50
  // Macro accents.
  protein: [56, 130, 246] as const, // blue-500
  carbs: [245, 158, 11] as const, // amber-500
  fat: [244, 63, 94] as const, // rose-500
  kcal: [30, 41, 59] as const,
}

type Args = {
  client: Client
  targets: Macros
  days: Day[]
  foodById: Map<string, Food>
  /** Optional — appears in the footer as "Plan by …". */
  coachName?: string
}

export function exportPlanToPdf({
  client,
  targets,
  days,
  foodById,
  coachName,
}: Args) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  doc.setFont("helvetica", "normal")

  let y = 0

  // Track the start-of-content y for each page so the footer never collides.
  const newPage = () => {
    doc.addPage()
    y = MARGIN_TOP
  }
  const needsRoom = (mm: number) => {
    if (y + mm > PAGE_H - MARGIN_BOTTOM) newPage()
  }

  // --- HEADER BAND ----------------------------------------------------------
  setFill(doc, C.brandDark)
  doc.rect(0, 0, PAGE_W, 28, "F")

  setText(doc, C.brandText)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text("MEAL PLAN", MARGIN_X, 14)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const subtitle = clientLine(client)
  doc.text(subtitle, MARGIN_X, 22)

  // Date in the band, right-aligned.
  doc.setFontSize(9)
  setText(doc, [203, 213, 225])
  doc.text(formatDate(new Date()), PAGE_W - MARGIN_X, 14, { align: "right" })

  y = 38

  // --- DAILY TARGETS --------------------------------------------------------
  setText(doc, C.subtle)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text("DAILY TARGETS", MARGIN_X, y)
  y += 5

  drawTargetCards(doc, MARGIN_X, y, CONTENT_W, targets)
  y += 24

  // --- DAYS -----------------------------------------------------------------
  days.forEach((day, idx) => {
    if (idx > 0) y += 4
    drawDay(doc, day, foodById, {
      onNewPage: () => {
        y = MARGIN_TOP
      },
      reserve: (mm) => needsRoom(mm),
      getY: () => y,
      setY: (next) => {
        y = next
      },
    })
  })

  // --- FOOTER ---------------------------------------------------------------
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, pages, coachName)
  }

  const filename = `${slugify(client.name || "client")}-meal-plan.pdf`
  doc.save(filename)
}

// =============================================================================
// SECTION RENDERERS
// =============================================================================

function drawTargetCards(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  targets: Macros
) {
  const gap = 3
  const cardW = (width - gap * 3) / 4
  const cardH = 20

  // Card label already implies the unit (CALORIES = kcal, PROTEIN/CARBS/FAT = g),
  // so we drop the suffix entirely — it was overlapping the value at certain widths.
  const stats = [
    { label: "CALORIES (kcal)", value: String(targets.calories), color: C.kcal },
    { label: "PROTEIN (g)", value: String(targets.protein), color: C.protein },
    { label: "CARBS (g)", value: String(targets.carbs), color: C.carbs },
    { label: "FAT (g)", value: String(targets.fat), color: C.fat },
  ]

  stats.forEach((s, i) => {
    const cx = x + i * (cardW + gap)

    // Card surface
    setFill(doc, C.surface)
    setDraw(doc, C.border)
    doc.setLineWidth(0.2)
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, "FD")

    // Color accent bar at the top
    setFill(doc, s.color)
    doc.rect(cx, y, cardW, 1.2, "F")

    // Label (unit included in the label itself to avoid the overlap)
    setText(doc, C.subtle)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    doc.text(s.label, cx + 3, y + 7)

    // Value
    setText(doc, C.text)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(s.value, cx + 3, y + 15)
  })
}

type Cursor = {
  onNewPage: () => void
  reserve: (mm: number) => void
  getY: () => number
  setY: (y: number) => void
}

function drawDay(
  doc: jsPDF,
  day: Day,
  foodById: Map<string, Food>,
  cursor: Cursor
) {
  const dayTotals = day.meals.reduce<Macros>(
    (acc, m) => {
      const t = itemsMacros(m.items, foodById)
      return {
        calories: acc.calories + t.calories,
        protein: acc.protein + t.protein,
        carbs: acc.carbs + t.carbs,
        fat: acc.fat + t.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // Day header — keep with at least one meal row underneath.
  cursor.reserve(28)
  let y = cursor.getY()

  // Left accent bar
  setFill(doc, C.brandDark)
  doc.rect(MARGIN_X, y, 1.2, 7, "F")

  setText(doc, C.text)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text(day.label, MARGIN_X + 4, y + 5.5)

  setText(doc, C.subtle)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(macroLine(dayTotals), PAGE_W - MARGIN_X, y + 5.5, { align: "right" })

  y += 9
  setDraw(doc, C.borderStrong)
  doc.setLineWidth(0.3)
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
  y += 5

  cursor.setY(y)

  // Meals
  day.meals.forEach((meal) => {
    if (meal.items.length === 0) return
    drawMeal(doc, meal, foodById, cursor)
  })

  // Day total card
  cursor.reserve(14)
  y = cursor.getY()
  setFill(doc, C.brandDark)
  doc.roundedRect(MARGIN_X, y, CONTENT_W, 10, 1.5, 1.5, "F")
  setText(doc, C.brandText)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("DAY TOTAL", MARGIN_X + 4, y + 6.5)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  doc.text(
    macroLine(dayTotals),
    PAGE_W - MARGIN_X - 4,
    y + 6.5,
    { align: "right" }
  )
  cursor.setY(y + 12)
}

function drawMeal(
  doc: jsPDF,
  meal: Meal,
  foodById: Map<string, Food>,
  cursor: Cursor
) {
  const totals = itemsMacros(meal.items, foodById)
  // Header + at least one row + bottom padding.
  cursor.reserve(18)
  let y = cursor.getY()

  // Meal name + totals row
  setText(doc, C.text)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(meal.name, MARGIN_X, y + 4)

  setText(doc, C.subtle)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(macroLine(totals), PAGE_W - MARGIN_X, y + 4, { align: "right" })

  y += 6

  // Subtle separator under the meal title.
  setDraw(doc, C.border)
  doc.setLineWidth(0.15)
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y)
  y += 3.5

  // Items
  meal.items.forEach((it) => {
    const food = foodById.get(it.foodId)
    if (!food) return
    // Each row is 5.5mm tall — wrap to next page if needed.
    if (y + 6 > PAGE_H - MARGIN_BOTTOM) {
      cursor.setY(y)
      cursor.onNewPage()
      y = cursor.getY()
    }
    drawItemRow(doc, food, it.grams, y)
    y += 5.5
  })

  y += 2.5 // breathing room before next meal
  cursor.setY(y)
}

function drawItemRow(doc: jsPDF, food: Food, grams: number, y: number) {
  const m = macrosForGrams(food, grams)
  const right = PAGE_W - MARGIN_X

  // Right side: inline-labelled macro summary so each number is self-explanatory.
  const macros = `${round(m.calories)} kcal · P ${round(m.protein, 1)} · C ${round(m.carbs, 1)} · F ${round(m.fat, 1)}`
  setText(doc, C.subtle)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(macros, right, y + 3.5, { align: "right" })
  const macrosW = doc.getTextWidth(macros)

  // Left side: name + amount, sized to whatever space remains.
  const amount = hasUnit(food)
    ? `${unitDisplay(food, grams)} (${grams}g)`
    : `${grams}g`

  setText(doc, C.subtle)
  doc.setFontSize(9)
  const amountW = doc.getTextWidth(amount)
  // Reserve a small gap between name and amount, and between amount and macros.
  const amountX = right - macrosW - 6 - amountW
  doc.text(amount, amountX, y + 3.5)

  setText(doc, C.text)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  const maxNameW = amountX - MARGIN_X - 4
  doc.text(truncate(doc, food.name, maxNameW), MARGIN_X, y + 3.5)
}

function drawFooter(
  doc: jsPDF,
  page: number,
  total: number,
  coachName: string | undefined
) {
  // Hairline above footer
  setDraw(doc, C.border)
  doc.setLineWidth(0.2)
  doc.line(MARGIN_X, PAGE_H - 10, PAGE_W - MARGIN_X, PAGE_H - 10)

  setText(doc, C.subtle)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  const byline = coachName?.trim() ? `Plan by ${coachName.trim()}` : ""
  if (byline) doc.text(byline, MARGIN_X, PAGE_H - 6)
  doc.text(
    `Page ${page} of ${total}`,
    PAGE_W - MARGIN_X,
    PAGE_H - 6,
    { align: "right" }
  )
}

// =============================================================================
// HELPERS
// =============================================================================

function macroLine(m: Macros): string {
  return `${round(m.calories)} kcal · P ${round(m.protein)}g · C ${round(m.carbs)}g · F ${round(m.fat)}g`
}

function clientLine(c: Client): string {
  const parts = [
    c.name || "Client",
    `${c.weightKg}kg`,
    `${c.heightCm}cm`,
    `${c.age}y`,
    capitalise(c.gender),
    capitalise(c.goal),
  ]
  return parts.join("  ·  ")
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

function setFill(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2])
}
function setDraw(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2])
}
function setText(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

function truncate(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (doc.getTextWidth(text.slice(0, mid) + "…") <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo) + "…"
}
