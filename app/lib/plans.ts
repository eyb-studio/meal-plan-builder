import { useCallback, useMemo } from "react"
import { nextId, useLocalStorage } from "./hooks"
import { defaultMacros } from "./macros"
import { DEFAULT_CLIENT, makeDay } from "./plan-defaults"
import type { Client, Day, Macros, Plan } from "./types"

const PLANS_KEY = "fpg.plans"
const ACTIVE_PLAN_KEY = "fpg.active-plan-id"

function makePlan(client: Client = DEFAULT_CLIENT): Plan {
  const now = Date.now()
  return {
    id: nextId("plan"),
    client,
    targets: defaultMacros(client),
    targetsCustomized: false,
    days: [makeDay("Day 1")],
    createdAt: now,
    updatedAt: now,
  }
}

export type PlanUpdater = (plan: Plan) => Plan

export function usePlans() {
  const [plans, setPlans] = useLocalStorage<Record<string, Plan>>(PLANS_KEY, {})
  const [activeId, setActiveId] = useLocalStorage<string | null>(
    ACTIVE_PLAN_KEY,
    null
  )

  // Boot: if no plans yet, create the first one and make it active.
  const planList = useMemo(
    () =>
      Object.values(plans).sort((a, b) => b.updatedAt - a.updatedAt),
    [plans]
  )

  const resolvedActiveId =
    activeId && plans[activeId] ? activeId : planList[0]?.id ?? null

  const activePlan = resolvedActiveId ? plans[resolvedActiveId] : null

  const ensureBootstrapped = useCallback(() => {
    if (planList.length > 0) return
    const p = makePlan()
    setPlans({ [p.id]: p })
    setActiveId(p.id)
  }, [planList.length, setPlans, setActiveId])

  const createPlan = useCallback(() => {
    const p = makePlan()
    setPlans((cur) => ({ ...cur, [p.id]: p }))
    setActiveId(p.id)
    return p
  }, [setPlans, setActiveId])

  const deletePlan = useCallback(
    (id: string) => {
      setPlans((cur) => {
        const next = { ...cur }
        delete next[id]
        return next
      })
      // If we deleted the active plan, fall through to the most recent remaining one.
      if (id === resolvedActiveId) {
        const remaining = planList.filter((p) => p.id !== id)
        setActiveId(remaining[0]?.id ?? null)
      }
    },
    [setPlans, setActiveId, resolvedActiveId, planList]
  )

  const updateActivePlan = useCallback(
    (updater: PlanUpdater) => {
      if (!resolvedActiveId) return
      setPlans((cur) => {
        const existing = cur[resolvedActiveId]
        if (!existing) return cur
        const next = updater(existing)
        if (next === existing) return cur
        return {
          ...cur,
          [resolvedActiveId]: { ...next, updatedAt: Date.now() },
        }
      })
    },
    [resolvedActiveId, setPlans]
  )

  const renameActivePlan = useCallback(
    (name: string) =>
      updateActivePlan((p) => ({ ...p, client: { ...p.client, name } })),
    [updateActivePlan]
  )

  return {
    plans: planList,
    activePlan,
    activePlanId: resolvedActiveId,
    setActivePlan: setActiveId,
    updateActivePlan,
    renameActivePlan,
    createPlan,
    deletePlan,
    ensureBootstrapped,
  }
}

/** Helpers that build a new days/targets/client value for an updater. */
export const planMutators = {
  setClient: (client: Client): PlanUpdater => (p) => {
    // Auto-recalc targets only when the coach hasn't overridden them.
    if (p.targetsCustomized) return { ...p, client }
    return { ...p, client, targets: defaultMacros(client) }
  },
  setTargets: (targets: Macros): PlanUpdater => (p) => ({
    ...p,
    targets,
    targetsCustomized: true,
  }),
  resetTargets: (): PlanUpdater => (p) => ({
    ...p,
    targets: defaultMacros(p.client),
    targetsCustomized: false,
  }),
  setDays: (days: Day[]): PlanUpdater => (p) => ({ ...p, days }),
}
