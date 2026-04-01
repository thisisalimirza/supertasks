import { useState, useRef, useEffect, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { useTaskStore } from '../store/taskStore'
import type { Task } from '../types/task'

function todayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Derive smart field defaults based on whichever view the user is currently in. */
function useCreationDefaults(): {
  defaults: Partial<Pick<Task, 'dueDate' | 'startDate' | 'project'>>
  hint: string | null
} {
  const activeView = useTaskStore(s => s.activeView)
  const selectedProject = useTaskStore(s => s.selectedProject)
  const activeSplitId = useTaskStore(s => s.activeSplitId)
  const splits = useTaskStore(s => s.splits)

  if (activeView === 'today') {
    return { defaults: { dueDate: todayISO() }, hint: 'Due today' }
  }

  if (activeView === 'tomorrow') {
    return { defaults: { dueDate: format(addDays(new Date(), 1), 'yyyy-MM-dd') }, hint: 'Due tomorrow' }
  }

  if (activeView === 'week') {
    return { defaults: { dueDate: todayISO() }, hint: 'Due today' }
  }

  if (activeView === 'project' && selectedProject) {
    return { defaults: { project: selectedProject }, hint: `◈ ${selectedProject}` }
  }

  if (activeView === 'split' && activeSplitId) {
    const split = splits.find(s => s.id === activeSplitId)
    if (split) {
      const defaults: Partial<Pick<Task, 'dueDate' | 'startDate' | 'project'>> = {}
      const hints: string[] = []
      // Single-project split → auto-assign that project
      if (split.rules.projects.length === 1) {
        defaults.project = split.rules.projects[0]
        hints.push(`◈ ${split.rules.projects[0]}`)
      }
      // Due-date-filtered split → default to today
      if (split.rules.dueBefore || split.rules.dueAfter) {
        defaults.dueDate = todayISO()
        hints.push('Due today')
      }
      if (hints.length > 0) return { defaults, hint: hints.join(' · ') }
    }
  }

  return { defaults: {}, hint: null }
}

export default function InlineTaskCreator() {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const store = useTaskStore()
  const { defaults, hint } = useCreationDefaults()

  // Snapshot the cursor position at the moment the creator opens so Escape
  // can restore it exactly — making C feel fully reversible
  const savedIndexRef = useRef(useTaskStore.getState().selectedIndex)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const cancel = useCallback(() => {
    store.setCreating(false)
    // Restore cursor to where it was before C was pressed
    store.setSelectedIndex(savedIndexRef.current)
  }, [store])

  const commit = async () => {
    if (value.trim()) {
      await store.createTask(value.trim(), defaults)
    }
    store.setCreating(false)
    setValue('')
  }

  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--c-b2)] bg-[var(--c-creator)] relative z-10">
      {/* Placeholder circle */}
      <div className="shrink-0 w-4 h-4 rounded-full border border-[var(--c-accent)] border-dashed" />
      <div className="w-3.5 h-3.5" /> {/* bulk checkbox space */}
      <div className="w-1.5 h-1.5" /> {/* priority dot space */}

      <input
        ref={inputRef}
        className="flex-1 bg-transparent text-sm text-[var(--c-t1)] outline-none placeholder:text-[var(--c-t7)]"
        placeholder="New task…"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation() // prevent window Escape chain from also firing
            cancel()
          }
        }}
        onBlur={() => {
          // Small delay so click actions can fire first
          setTimeout(() => store.setCreating(false), 150)
        }}
      />

      {/* Context hint badge — shows which fields will be auto-applied */}
      {hint && (
        <span className="text-[10px] font-mono text-[var(--c-accent)] bg-[var(--c-sel)] px-1.5 py-0.5 rounded shrink-0">
          {hint}
        </span>
      )}

      <span className="text-xs text-[var(--c-t8)] font-mono shrink-0">↵ to save</span>
    </div>
  )
}
