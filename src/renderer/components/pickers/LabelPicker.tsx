import { useState, useEffect, useRef } from 'react'
import Fuse from 'fuse.js'
import { useTaskStore } from '../../store/taskStore'

interface Props {
  taskId: string
}

export default function LabelPicker({ taskId }: Props) {
  const store = useTaskStore()
  const task = store.tasks.find(t => t.id === taskId)
  const bulkIds = store.selectedTaskIds.size > 0 ? Array.from(store.selectedTaskIds) : null
  const bulkCount = bulkIds?.length ?? 0
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const allLabels = store.getAllLabels()
  const filtered: string[] = query.trim()
    ? new Fuse(allLabels, { threshold: 0.4, ignoreLocation: true }).search(query).map(r => r.item)
    : allLabels

  // If query doesn't match any label and has content, offer to create it
  const canCreate = query.trim() && !allLabels.includes(query.trim())
  const items: Array<{ label: string; isCreate?: boolean }> = [
    ...filtered.map(l => ({ label: l })),
    ...(canCreate ? [{ label: query.trim(), isCreate: true }] : []),
  ]

  useEffect(() => { setActiveIdx(0) }, [query])

  const toggle = (label: string) => {
    if (bulkIds) {
      // Add to all tasks missing it; if all already have it, remove from all
      const bulkTasks = bulkIds.map(id => store.tasks.find(t => t.id === id)).filter(Boolean)
      const allHave = bulkTasks.every(t => t!.labels.includes(label))
      bulkIds.forEach(id => {
        const t = store.tasks.find(t => t.id === id)
        if (!t) return
        if (allHave || !t.labels.includes(label)) store.toggleLabel(id, label)
      })
    } else {
      store.toggleLabel(taskId, label)
    }
    setQuery('')
  }

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setActiveIdx(i => Math.min(i + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && items[activeIdx]) { e.preventDefault(); e.stopPropagation(); toggle(items[activeIdx].label) }
    if (e.key === 'Escape') { e.stopPropagation(); store.closePicker() }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [activeIdx, items])

  return (
    <div className="overflow-hidden border-b border-[var(--c-b1)]"
    >
      <div className="px-6 py-2 bg-[var(--c-elevated)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold text-[var(--c-t7)] uppercase tracking-widest">Labels</span>
          {bulkCount > 0
            ? <span className="text-[10px] font-mono text-[var(--c-accent)] bg-[var(--c-sel)] px-1.5 py-0.5 rounded">{bulkCount} tasks</span>
            : null
          }
          {!bulkCount && task && task.labels.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {task.labels.map(l => (
                <span key={l} className="text-[10px] font-mono text-[var(--c-accent)] bg-[var(--c-sel)] px-1.5 py-0.5 rounded">
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2 bg-[var(--c-btn)] rounded-lg px-3 py-1.5 mb-2">
          <svg className="w-3 h-3 text-[var(--c-t6)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-xs text-[var(--c-t1)] outline-none placeholder:text-[var(--c-t7)]"
            placeholder="Search or create label…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Labels list */}
        <div className="max-h-[160px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-xs text-[var(--c-t7)] px-2 py-3 text-center">No labels yet</div>
          ) : (
            items.map((item, i) => {
              const isActive = task?.labels.includes(item.label)
              return (
                <button
                  key={item.label}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                    i === activeIdx ? 'bg-[var(--c-sel)]' : 'hover:bg-[var(--c-btn)]'
                  }`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => toggle(item.label)}
                >
                  <span className={item.isCreate ? 'text-[var(--c-accent)]' : 'text-[var(--c-t2)]'}>
                    {item.isCreate ? `+ Create "${item.label}"` : item.label}
                  </span>
                  {isActive && <span className="text-[var(--c-accent)] text-xs">✓</span>}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
