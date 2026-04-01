import { useEffect } from 'react'
import { useTaskStore } from '../store/taskStore'
import type { Toast as ToastType } from '../store/taskStore'

const DURATION = 3500

function ToastItem({ toast }: { toast: ToastType }) {
  const store = useTaskStore()

  useEffect(() => {
    const timer = setTimeout(() => store.dismissToast(toast.id), DURATION)
    return () => clearTimeout(timer)
  }, [toast.id])

  const handleUndo = async () => {
    store.dismissToast(toast.id)
    await store.undo()
  }

  return (
    <div
      className="w-64 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--c-elevated)] border border-[var(--c-b2)] shadow-lg backdrop-blur-sm"
    >
      <span className="flex-1 text-xs text-[var(--c-t3)] font-mono truncate">{toast.message}</span>
      {toast.undoId && (
        <button
          onClick={handleUndo}
          className="no-drag text-[10px] font-semibold text-[var(--c-accent)] hover:opacity-80 transition-opacity font-mono ml-1"
        >
          Undo
        </button>
      )}
      <button
        onClick={() => store.dismissToast(toast.id)}
        className="no-drag text-[var(--c-t7)] hover:text-[var(--c-t5)] transition-colors text-xs leading-none"
      >
        ×
      </button>
    </div>
  )
}

export default function ToastStack() {
  const toasts = useTaskStore(s => s.toasts)

  return (
    <div className="fixed bottom-10 right-6 z-[70] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  )
}
