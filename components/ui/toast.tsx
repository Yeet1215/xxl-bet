'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useRef,
  type ReactNode,
} from 'react'

type ToastVariant = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// Dedup window (fitapp lesson): two showToast calls with the same
// (variant, message) within this many ms collapse to one toast — catches
// Strict-mode double-fire, rapid double-clicks, and re-run success effects.
const TOAST_DEDUP_MS = 1500
const DURATION_MS = 2500

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const recentRef = useRef<Map<string, number>>(new Map())

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const key = `${variant}:${message}`
      const now = Date.now()
      const last = recentRef.current.get(key)
      if (last !== undefined && now - last < TOAST_DEDUP_MS) return
      recentRef.current.set(key, now)

      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => removeToast(id), DURATION_MS)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Top-center (DESIGN.md) — clear of the sticky header's actions. */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDone={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  const style = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    info: 'bg-text-primary text-white',
  }[toast.variant]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-auto rounded-[10px] text-sm font-semibold shadow-lg ${style}`}
    >
      <button
        type="button"
        onClick={() => onDone(toast.id)}
        aria-label="Dismiss notification"
        className="px-4 py-2.5 text-left"
      >
        {toast.message}
      </button>
    </div>
  )
}
