import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { X } from "lucide-react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

type ToastAction = { label: string; onClick: () => void }

type Toast = {
  id: string
  message: string
  action?: ToastAction
  durationMs: number
}

type ToastInput = {
  message: string
  action?: ToastAction
  durationMs?: number
}

type ToastContextValue = {
  toast: (t: ToastInput) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let counter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((cur) => cur.filter((t) => t.id !== id))
    const handle = timers.current.get(id)
    if (handle) {
      window.clearTimeout(handle)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    ({ message, action, durationMs = 5000 }: ToastInput) => {
      counter += 1
      const id = `toast-${counter}`
      setToasts((cur) => [...cur, { id, message, action, durationMs }])
      const handle = window.setTimeout(() => dismiss(id), durationMs)
      timers.current.set(id, handle)
    },
    [dismiss]
  )

  useEffect(() => {
    return () => {
      timers.current.forEach((h) => window.clearTimeout(h))
      timers.current.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex flex-col items-center gap-2 px-3 sm:bottom-4 sm:items-end sm:pr-4"
        )}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-foreground text-background pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg px-3 py-2 text-sm shadow-lg ring-1 ring-foreground/10"
            role="status"
          >
            <span className="flex-1 truncate">{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action!.onClick()
                  dismiss(t.id)
                }}
                className="font-medium underline-offset-2 hover:underline"
              >
                {t.action.label}
              </button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => dismiss(t.id)}
              className="text-background hover:bg-background/10 hover:text-background"
              aria-label="Dismiss"
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside a ToastProvider")
  return ctx
}
