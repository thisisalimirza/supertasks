import { useEffect } from 'react'
import { useTaskStore } from '../store/taskStore'

interface Props {
  taskId: string
}

export default function DeleteConfirmRow({ taskId }: Props) {
  const store = useTaskStore()
  const task = store.tasks.find(t => t.id === taskId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        store.confirmDelete()
      }
      if (e.key === 'Escape') {
        e.stopPropagation()
        store.setPendingDelete(null)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  if (!task) return null

  return (
    <div
      className="overflow-hidden border-b border-[var(--c-danger)]/30"
    >
      <div className="flex items-center justify-between px-6 py-2.5 bg-[var(--c-danger)]/8">
        <div className="flex items-center gap-3">
          <span className="text-[var(--c-danger)] text-sm">🗑</span>
          <div>
            <span className="text-sm text-[var(--c-danger)] font-medium">Delete </span>
            <span className="text-sm text-[var(--c-t3)] truncate max-w-[260px] inline-block align-bottom">"{task.title}"?</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => store.setPendingDelete(null)}
            className="no-drag text-xs text-[var(--c-t6)] hover:text-[var(--c-t3)] transition-colors font-mono"
          >
            ⎋ Cancel
          </button>
          <button
            onClick={() => store.confirmDelete()}
            className="no-drag text-xs text-[var(--c-danger)] hover:opacity-80 transition-opacity font-medium font-mono"
          >
            ↵ Delete
          </button>
        </div>
      </div>
    </div>
  )
}
