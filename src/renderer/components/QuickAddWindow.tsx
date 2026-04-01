import { useState, useRef, useEffect } from 'react'
import { addDays, nextSaturday, nextMonday, format } from 'date-fns'
import Fuse from 'fuse.js'
import type { Task } from '../types/task'

function nanoid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}
function toISO(d: Date) { return format(d, 'yyyy-MM-dd') }
function now() { return new Date() }
function fmtDisplay(iso: string) { return format(new Date(iso + 'T12:00:00'), 'MMM d') }

const DUE_PRESETS = [
  { label: 'Today',        hint: () => format(now(), 'EEE'),                      get: () => toISO(now()) },
  { label: 'Tomorrow',     hint: () => format(addDays(now(), 1), 'EEE'),           get: () => toISO(addDays(now(), 1)) },
  { label: 'This Weekend', hint: () => format(nextSaturday(now()), 'EEE, MMM d'),  get: () => toISO(nextSaturday(now())) },
  { label: 'Next Week',    hint: () => format(nextMonday(now()), 'EEE, MMM d'),    get: () => toISO(nextMonday(now())) },
  { label: 'In 2 Weeks',   hint: () => format(addDays(now(), 14), 'MMM d'),        get: () => toISO(addDays(now(), 14)) },
  { label: 'No Date',      hint: () => 'Remove',                                   get: (): string | null => null },
]

const START_PRESETS = [
  { label: 'Tomorrow',     hint: () => format(addDays(now(), 1), 'EEE'),           get: () => toISO(addDays(now(), 1)) },
  { label: 'In 3 Days',    hint: () => format(addDays(now(), 3), 'EEE, MMM d'),    get: () => toISO(addDays(now(), 3)) },
  { label: 'Next Week',    hint: () => format(nextMonday(now()), 'EEE, MMM d'),    get: () => toISO(nextMonday(now())) },
  { label: 'In 2 Weeks',   hint: () => format(addDays(now(), 14), 'MMM d'),        get: () => toISO(addDays(now(), 14)) },
  { label: 'Clear',        hint: () => 'Remove',                                   get: (): string | null => null },
]

type ActivePicker = 'due' | 'start' | 'project' | null

export default function QuickAddWindow() {
  const [value, setValue] = useState('')
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [project, setProject] = useState<string | null>(null)
  const [activePicker, setActivePicker] = useState<ActivePicker>(null)
  const [pickerIdx, setPickerIdx] = useState(0)
  const [projects, setProjects] = useState<string[]>([])
  const [projQuery, setProjQuery] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const projInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Sync theme with main window + signal main process that React has mounted
  useEffect(() => {
    const theme = localStorage.getItem('supertasks-theme') ?? 'light'
    document.documentElement.setAttribute('data-theme', theme)
    window.api?.quickAdd?.signalReady?.()
  }, [])

  // ResizeObserver: window height tracks card height automatically
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const ro = new ResizeObserver(entries => {
      const h = Math.ceil(entries[0].contentRect.height) + 16 // 8px padding top + bottom
      if (h < 50) return // skip spurious near-zero measurements during initial layout
      window.api?.quickAdd?.resize(h)
    })
    ro.observe(card)
    return () => ro.disconnect()
  }, [])

  const loadProjects = async () => {
    try {
      const tasks: Task[] = await window.api.tasks.getAll()
      const names = [...new Set(tasks.map(t => t.project).filter(Boolean))] as string[]
      setProjects(names)
    } catch {}
  }

  // On window show: reset everything, focus input, refresh project list.
  // Uses the explicit IPC signal sent by main after show()+focus() — more reliable
  // than the native 'focus' window event, which can fire before this listener is
  // registered (first ever show) or get swallowed during macOS space transitions.
  useEffect(() => {
    const handleFocus = () => {
      setValue('')
      setDueDate(null)
      setStartDate(null)
      setProject(null)
      setActivePicker(null)
      setProjQuery('')
      inputRef.current?.focus()
      loadProjects()
    }
    const unsub = window.api?.quickAdd?.onFocus?.(handleFocus)
    // Native focus as fallback (e.g. user clicks window after blur)
    window.addEventListener('focus', handleFocus)
    return () => {
      unsub?.()
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const openPicker = (p: ActivePicker) => {
    setActivePicker(p)
    setPickerIdx(0)
    setProjQuery('')
    if (p === 'project') setTimeout(() => projInputRef.current?.focus(), 30)
  }

  const closePicker = (focusInput = true) => {
    setActivePicker(null)
    if (focusInput) setTimeout(() => inputRef.current?.focus(), 0)
  }

  const dismiss = () => {
    setValue('')
    setDueDate(null)
    setStartDate(null)
    setProject(null)
    setActivePicker(null)
    window.api?.quickAdd?.dismiss()
  }

  const commit = async () => {
    const title = value.trim()
    const task: Task | null = title ? {
      id: nanoid(),
      title,
      notes: '',
      status: 'inbox',
      priority: 'none',
      dueDate,
      startDate,
      reminder: null,
      project: project || '',
      labels: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      starred: false,
      sortOrder: Date.now(),
    } : null
    // Single IPC: persist task + restore focus to previous app + hide window.
    // If we called tasks.create then dismiss separately, the tasks:changed IPC
    // to the main window would race restoreFrontmostApp(), causing focus to
    // land on the SuperTasks main window instead of the user's previous app.
    await window.api.quickAdd.submit(task)
  }

  const filteredProjects = projQuery.trim()
    ? new Fuse(projects, { threshold: 0.4, ignoreLocation: true }).search(projQuery).map(r => r.item)
    : projects

  // Keyboard in picker dropdowns (capture phase so it beats the main input handler)
  useEffect(() => {
    if (!activePicker) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(); return }
      if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); closePicker(); return }

      const presets = activePicker === 'due' ? DUE_PRESETS : activePicker === 'start' ? START_PRESETS : null
      if (presets) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setPickerIdx(i => Math.min(i + 1, presets.length - 1)) }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setPickerIdx(i => Math.max(i - 1, 0)) }
        if (e.key === 'Enter') {
          e.preventDefault()
          const val = presets[pickerIdx].get()
          if (activePicker === 'due') setDueDate(val)
          else setStartDate(val)
          closePicker()
        }
      }
      if (activePicker === 'project') {
        const list = filteredProjects
        if (e.key === 'ArrowDown') { e.preventDefault(); setPickerIdx(i => Math.min(i + 1, list.length - 1)) }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setPickerIdx(i => Math.max(i - 1, 0)) }
        if (e.key === 'Enter' && list[pickerIdx]) {
          e.preventDefault()
          setProject(list[pickerIdx])
          closePicker()
        }
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [activePicker, pickerIdx, filteredProjects])

  const chipClass = (active: boolean, set: boolean) =>
    `flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors ${
      set    ? 'bg-[var(--c-accent)]/12 text-[var(--c-accent)] border-[var(--c-accent)]/25'
      : active ? 'bg-[var(--c-sel)] text-[var(--c-t1)] border-[var(--c-b2)]'
      :          'text-[var(--c-t6)] bg-[var(--c-btn)] border-transparent hover:border-[var(--c-b2)] hover:text-[var(--c-t4)]'
    }`

  return (
    <div className="flex flex-col items-center justify-start" style={{ padding: '8px' }}>
      <div ref={cardRef} className="w-full rounded-2xl bg-[var(--c-surface)] border border-[var(--c-b2)] shadow-2xl overflow-hidden">

        {/* Title input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--c-b1)]">
          <svg className="w-4 h-4 shrink-0 text-[var(--c-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-[15px] text-[var(--c-t1)] outline-none placeholder:text-[var(--c-t7)] font-[450]"
            placeholder="What needs to be done?"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); commit() }
              if (e.key === 'Escape') { e.preventDefault(); dismiss() }
            }}
          />
        </div>

        {/* Metadata chips */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--c-b1)]">
          <button className={chipClass(activePicker === 'due', !!dueDate)}
            onClick={() => activePicker === 'due' ? closePicker() : openPicker('due')}>
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {dueDate ? fmtDisplay(dueDate) : 'Due date'}
          </button>

          <button className={chipClass(activePicker === 'start', !!startDate)}
            onClick={() => activePicker === 'start' ? closePicker() : openPicker('start')}>
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
            </svg>
            {startDate ? `From ${fmtDisplay(startDate)}` : 'Hold until'}
          </button>

          <button className={chipClass(activePicker === 'project', !!project)}
            onClick={() => activePicker === 'project' ? closePicker() : openPicker('project')}>
            <span className="text-[9px] leading-none">◈</span>
            {project || 'Project'}
          </button>
        </div>

        {/* Picker dropdown */}
        {activePicker && (
          <div className="border-b border-[var(--c-b1)] px-3 py-2">

            {/* Due date presets */}
            {activePicker === 'due' && DUE_PRESETS.map((p, i) => (
              <button key={p.label} onMouseEnter={() => setPickerIdx(i)}
                onClick={() => { setDueDate(p.get()); closePicker() }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors mb-0.5 ${
                  i === pickerIdx ? 'bg-[var(--c-sel)] text-[var(--c-t1)]' : 'text-[var(--c-t3)] hover:bg-[var(--c-btn)]'
                }`}>
                <span className={p.label === 'No Date' ? 'text-[var(--c-danger)]' : ''}>{p.label}</span>
                <span className="text-[10px] font-mono text-[var(--c-t6)]">{p.hint()}</span>
              </button>
            ))}

            {/* Hold until presets */}
            {activePicker === 'start' && START_PRESETS.map((p, i) => (
              <button key={p.label} onMouseEnter={() => setPickerIdx(i)}
                onClick={() => { setStartDate(p.get()); closePicker() }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors mb-0.5 ${
                  i === pickerIdx ? 'bg-[var(--c-sel)] text-[var(--c-t1)]' : 'text-[var(--c-t3)] hover:bg-[var(--c-btn)]'
                }`}>
                <span className={p.label === 'Clear' ? 'text-[var(--c-danger)]' : ''}>{p.label}</span>
                <span className="text-[10px] font-mono text-[var(--c-t6)]">{p.hint()}</span>
              </button>
            ))}

            {/* Project picker */}
            {activePicker === 'project' && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 mb-1.5 bg-[var(--c-btn)] rounded-lg">
                  <span className="text-[9px] text-[var(--c-t6)]">◈</span>
                  <input
                    ref={projInputRef}
                    className="flex-1 bg-transparent text-xs text-[var(--c-t1)] outline-none placeholder:text-[var(--c-t7)]"
                    placeholder="Search projects…"
                    value={projQuery}
                    onChange={e => { setProjQuery(e.target.value); setPickerIdx(0) }}
                  />
                </div>
                {filteredProjects.length === 0 && (
                  <p className="px-3 py-2 text-[11px] text-[var(--c-t7)] font-mono">No projects found</p>
                )}
                {filteredProjects.slice(0, 6).map((p, i) => (
                  <button key={p} onMouseEnter={() => setPickerIdx(i)}
                    onClick={() => { setProject(p); closePicker() }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors mb-0.5 ${
                      i === pickerIdx ? 'bg-[var(--c-sel)] text-[var(--c-t1)]' : 'text-[var(--c-t3)] hover:bg-[var(--c-btn)]'
                    }`}>
                    <span className="text-[9px] text-[var(--c-t6)]">◈</span>
                    {p}
                  </button>
                ))}
                {project && (
                  <button onClick={() => { setProject(null); closePicker() }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--c-danger)] hover:bg-[var(--c-btn)] mt-0.5">
                    Clear project
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[var(--c-btn)]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[var(--c-t7)] uppercase tracking-widest">Adding to</span>
            <span className="text-[10px] font-semibold text-[var(--c-accent)] uppercase tracking-widest">
              {project || 'Inbox'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--c-t7)] font-mono">
            <span>↵ add</span>
            <span>⎋ cancel</span>
          </div>
        </div>

      </div>
    </div>
  )
}
