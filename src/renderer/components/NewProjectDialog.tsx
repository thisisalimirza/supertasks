import { useState, useRef, useEffect } from 'react'
import { useTaskStore } from '../store/taskStore'
import { SPLIT_VIEW_SOFT_LIMIT } from './SettingsPanel'

export default function NewProjectDialog() {
  const store = useTaskStore()
  const existingCount = store.splits.filter(s => s.enabled).length
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  const close = () => { store.setNewProjectOpen(false); setName('') }

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) { inputRef.current?.focus(); return }
    // Create a split view scoped to this project name, then navigate to it
    const split = await store.createSplit({
      name: trimmed,
      rules: {
        projects: [trimmed],
        labels: [], priorities: [],
        dueBefore: null, dueAfter: null, starred: null,
      },
      ruleOperator: 'AND',
      enabled: true,
    })
    store.setActiveSplit(split.id)
    close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={close}>
      <div
        className="w-[400px] bg-[var(--c-surface)] border border-[var(--c-b2)] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-[var(--c-b1)]">
          <h2 className="text-sm font-semibold text-[var(--c-t1)] mb-3">New Project</h2>
          <input
            ref={inputRef}
            className="w-full bg-[var(--c-btn)] text-sm text-[var(--c-t1)] placeholder:text-[var(--c-t7)] rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--c-accent)] transition"
            placeholder="Project name…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
          />
          <p className="text-[10px] text-[var(--c-t7)] mt-2 font-mono">
            Tasks assigned to this project will appear here automatically.
          </p>
          {existingCount >= SPLIT_VIEW_SOFT_LIMIT && (
            <p className="mt-2 text-[10px] text-[var(--c-t6)] leading-relaxed">
              You already have {existingCount} views. More than {SPLIT_VIEW_SOFT_LIMIT} can fragment your focus — consider consolidating before adding more.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={close}
            className="no-drag text-xs text-[var(--c-t6)] hover:text-[var(--c-t3)] transition-colors font-mono"
          >
            ⎋ Cancel
          </button>
          <button
            onClick={save}
            className="no-drag px-4 py-1.5 bg-[var(--c-accent)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
