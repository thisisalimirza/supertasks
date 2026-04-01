import { useState, useEffect, useRef } from 'react'
import Fuse from 'fuse.js'
import { useTaskStore } from '../store/taskStore'

export default function ProjectNavOverlay() {
  const store = useTaskStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); store.setProjectNavOpen(false) }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  const allProjects = store.getAllProjectNames()

  const filtered: string[] = query.trim()
    ? new Fuse(allProjects, { threshold: 0.4, ignoreLocation: true }).search(query).map(r => r.item)
    : allProjects

  useEffect(() => { setActiveIndex(0) }, [query])

  const navigate = (projectName: string) => {
    store.navigateToProject(projectName)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIndex]) navigate(filtered[activeIndex]) }
    if (e.key === 'Escape') store.setProjectNavOpen(false)
  }

  const close = () => store.setProjectNavOpen(false)

  // Count tasks per project
  const taskCounts: Record<string, number> = {}
  store.tasks.forEach(t => {
    if (t.project && t.status !== 'archived' && t.status !== 'done') {
      taskCounts[t.project] = (taskCounts[t.project] ?? 0) + 1
    }
  })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={close}>
      <div
        className="w-[500px] bg-[var(--c-surface)] border border-[var(--c-b2)] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--c-b1)]">
          <span className="text-[var(--c-t6)] text-sm">◈</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-[var(--c-t1)] outline-none placeholder:text-[var(--c-t7)]"
            placeholder="Jump to project…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <kbd className="text-[10px] text-[var(--c-t6)] bg-[var(--c-btn)] px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Projects */}
        <div className="py-2 max-h-[320px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--c-t6)]">
              {allProjects.length === 0 ? 'No projects yet — assign a project to a task with M' : `No results for "${query}"`}
            </div>
          ) : (
            filtered.map((project, i) => (
              <button
                key={project}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === activeIndex ? 'bg-[var(--c-sel)]' : 'hover:bg-[var(--c-cmd-row)]'
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => navigate(project)}
              >
                <span className="text-[var(--c-t6)] text-xs font-mono">◈</span>
                <span className="flex-1 text-sm text-[var(--c-t2)]">{project}</span>
                {taskCounts[project] != null && (
                  <span className="text-[10px] font-mono text-[var(--c-t7)] bg-[var(--c-btn)] px-1.5 py-0.5 rounded">
                    {taskCounts[project]}
                  </span>
                )}
                {i === activeIndex && (
                  <kbd className="text-[10px] text-[var(--c-t5)] bg-[var(--c-btn)] px-1.5 py-0.5 rounded font-mono shrink-0">↵</kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
