import { useEffect, useState } from "react"

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
