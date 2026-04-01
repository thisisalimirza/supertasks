import { useState, useEffect, useRef } from 'react'
import Fuse from 'fuse.js'
import { useTaskStore } from '../../store/taskStore'

interface Props {
  taskId: string
}

export default function ProjectPicker({ taskId }: Props) {
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

  const allProjects = store.getAllProjectNames()
  const filtered: string[] = query.trim()
    ? new Fuse(allProjects, { threshold: 0.4, ignoreLocation: true }).search(query).map(r => r.item)
    : allProjects

  const canCreate = query.trim() && !allProjects.includes(query.trim())
  const items: Array<{ name: string; isCreate?: boolean; isClear?: boolean }> = [
    { name: '', isClear: true },
    ...filtered.map(p => ({ name: p })),
    ...(canCreate ? [{ name: query.trim(), isCreate: true }] : []),
  ]

  useEffect(() => {
    // When typing: jump to first match, or Create option if no matches, not "No project"
    setActiveIdx(query.trim() && (filtered.length > 0 || canCreate) ? 1 : 0)
  }, [query])

  const select = (projectName: string) => {
    const ids = bulkIds ?? [taskId]
    ids.forEach(id => store.setTaskProject(id, projectName))
    store.closePicker()
  }

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setActiveIdx(i => Math.min(i + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && items[activeIdx] !== undefined) { e.preventDefault(); e.stopPropagation(); select(items[activeIdx].name) }
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
          <span className="text-[10px] font-semibold text-[var(--c-t7)] uppercase tracking-widest">Project</span>
          {bulkCount > 0
            ? <span className="text-[10px] font-mono text-[var(--c-accent)] bg-[var(--c-sel)] px-1.5 py-0.5 rounded">{bulkCount} tasks</span>
            : task?.project
              ? <span className="text-[10px] font-mono text-[var(--c-accent)] bg-[var(--c-sel)] px-1.5 py-0.5 rounded">{task.project}</span>
              : null
          }
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2 bg-[var(--c-btn)] rounded-lg px-3 py-1.5 mb-2">
          <svg className="w-3 h-3 text-[var(--c-t6)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-xs text-[var(--c-t1)] outline-none placeholder:text-[var(--c-t7)]"
            placeholder="Search or create project…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* Projects list */}
        <div className="max-h-[160px] overflow-y-auto">
          {items.map((item, i) => {
            const isActive = task?.project === item.name
            return (
              <button
                key={item.name || '__clear__'}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors mb-0.5 ${
                  i === activeIdx ? 'bg-[var(--c-sel)]' : 'hover:bg-[var(--c-btn)]'
                }`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => select(item.name)}
              >
                <span className={
                  item.isClear ? 'text-[var(--c-t6)]' :
                  item.isCreate ? 'text-[var(--c-accent)]' :
                  'text-[var(--c-t2)]'
                }>
                  {item.isClear ? 'No project' : item.isCreate ? `+ Create "${item.name}"` : item.name}
                </span>
                {isActive && !item.isClear && <span className="text-[var(--c-accent)] text-xs">✓</span>}
                {item.isClear && !task?.project && <span className="text-[var(--c-accent)] text-xs">✓</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
