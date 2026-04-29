import { useState, useEffect, useRef } from 'react'
import { useTaskStore } from '../store/taskStore'
import { useWindowWidth } from '../hooks/useWindowWidth'
import PriorityDot from './PriorityDot'
import type { TaskPriority } from '../types/task'
import { format, parseISO } from 'date-fns'

/** Below this width the detail panel becomes a full-screen overlay instead of a side panel */
const NARROW_BREAKPOINT = 600

const PRIORITY_LABELS: TaskPriority[] = ['none', 'low', 'medium', 'high', 'urgent']
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none: 'var(--c-t6)',
  low: '#5B6AFF',
  medium: '#C4920A',
  high: '#FF8C00',
  urgent: '#FF4444',
}

export default function TaskDetail() {
  const store = useTaskStore()
  const isOpen = store.isDetailOpen
  const task = store.tasks.find(t => t.id === store.selectedTaskId)
  const windowWidth = useWindowWidth()
  const isNarrow = windowWidth <= NARROW_BREAKPOINT

  const [dueInput, setDueInput] = useState('')
  const [startInput, setStartInput] = useState('')
  const [showDuePicker, setShowDuePicker] = useState(false)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (task) {
      setDueInput(task.dueDate ? format(parseISO(task.dueDate), 'yyyy-MM-dd') : '')
      setStartInput(task.startDate ? format(parseISO(task.startDate), 'yyyy-MM-dd') : '')
    }
  }, [task?.id])

  // Auto-focus notes when detail opens
  useEffect(() => {
    if (isOpen && task) {
      setTimeout(() => {
        if (notesRef.current) {
          notesRef.current.focus()
          const len = notesRef.current.value.length
          notesRef.current.setSelectionRange(len, len)
        }
      }, 50)
    }
  }, [isOpen, task?.id])

  const cyclePriority = () => {
    if (task) store.cyclePriority(task.id)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen || !task) return
      if (e.key === 'Escape') { store.closeDetail(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        store.closeDetail()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ',') {
        e.preventDefault()
        cyclePriority()
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, task])

  // Tab key → focus notes (dispatched by useKeyboard)
  useEffect(() => {
    const handler = () => {
      if (isOpen && notesRef.current) {
        notesRef.current.focus()
        const len = notesRef.current.value.length
        notesRef.current.setSelectionRange(len, len)
      }
    }
    window.addEventListener('supertasks:focus-notes', handler)
    return () => window.removeEventListener('supertasks:focus-notes', handler)
  }, [isOpen])

  if (!task) return null

  return (
    <>
      {isOpen && (
        <div
          className={[
            'bg-[var(--c-panel)] flex flex-col overflow-hidden',
            isNarrow
              // top-11 clears the 44px TitleBar so traffic lights are never covered
              ? 'fixed inset-x-0 bottom-0 top-11 z-30'
              : 'absolute right-0 top-0 bottom-0 w-[420px] border-l border-[var(--c-b2)]',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--c-b1)]">
            <button
              onClick={() => store.closeDetail()}
              className="no-drag text-[var(--c-t6)] hover:text-[var(--c-t4)] transition-colors text-sm"
            >
              {isNarrow ? '← Back' : '← Close'}
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={cyclePriority}
                className="no-drag flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors text-xs font-medium"
                title="Cycle priority (⌘⇧,)"
                style={{
                  color: PRIORITY_COLORS[task.priority],
                  backgroundColor: task.priority === 'none' ? 'var(--c-btn)' : PRIORITY_COLORS[task.priority] + '22',
                }}
              >
                <PriorityDot priority={task.priority} size="md" />
                {task.priority === 'none' ? 'No priority' : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </button>
              <button
                onClick={() => store.toggleStar(task.id)}
                className={`no-drag w-7 h-7 rounded flex items-center justify-center transition-colors text-sm
                  ${task.starred ? 'text-[var(--c-warn)]' : 'text-[var(--c-t6)] hover:text-[var(--c-t4)]'}`}
              >
                ★
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="px-6 pt-5">
            <input
              className="no-drag w-full bg-transparent text-lg font-medium text-[var(--c-t1)] outline-none border-b border-transparent focus:border-[var(--c-accent)] pb-1 transition-colors"
              value={task.title}
              onChange={e => store.updateTask(task.id, { title: e.target.value })}
              placeholder="Task title"
            />
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-2 px-6 py-4 text-xs text-[var(--c-t6)]">
            <span className="font-mono shrink-0">{format(parseISO(task.createdAt), 'MMM d, yyyy')}</span>
            {task.completedAt && (
              <span className="text-[var(--c-success)] shrink-0">
                Done {format(parseISO(task.completedAt), 'MMM d')}
              </span>
            )}

            {/* Due date */}
            <div className="relative">
              <button
                onClick={() => setShowDuePicker(!showDuePicker)}
                className={`no-drag flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--c-btn)] transition-colors whitespace-nowrap ${
                  task.dueDate ? 'text-[var(--c-t1)]' : 'text-[var(--c-t6)]'
                }`}
              >
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {task.dueDate ? format(parseISO(task.dueDate), 'MMM d') : 'Due date'}
              </button>
              {showDuePicker && (
                <div className="absolute top-7 left-0 z-50 bg-[var(--c-elevated)] border border-[var(--c-b2)] rounded-lg p-3 shadow-xl">
                  <input
                    type="date"
                    className="no-drag bg-transparent text-sm text-[var(--c-t1)] outline-none"
                    value={dueInput}
                    onChange={e => {
                      setDueInput(e.target.value)
                      store.updateTask(task.id, { dueDate: e.target.value || null })
                      setShowDuePicker(false)
                    }}
                  />
                  <button
                    className="no-drag block w-full text-center text-xs text-[var(--c-danger)] mt-2 hover:opacity-80 transition-opacity"
                    onClick={() => {
                      store.updateTask(task.id, { dueDate: null })
                      setDueInput('')
                      setShowDuePicker(false)
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Start date (hold until) */}
            <div className="relative">
              <button
                onClick={() => { setShowStartPicker(!showStartPicker); setShowDuePicker(false) }}
                className={`no-drag flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--c-btn)] transition-colors ${
                  task.startDate ? 'text-[var(--c-t1)]' : 'text-[var(--c-t6)]'
                }`}
                title="Hold until this date — task is hidden from Inbox until then"
              >
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <circle cx="12" cy="12" r="9"/>
                  <polyline points="12 7 12 12 15 15"/>
                </svg>
                {task.startDate ? `From ${format(parseISO(task.startDate), 'MMM d')}` : 'Hold until'}
              </button>
              {showStartPicker && (
                <div className="absolute top-7 left-0 z-50 bg-[var(--c-elevated)] border border-[var(--c-b2)] rounded-lg p-3 shadow-xl">
                  <p className="text-[10px] text-[var(--c-t7)] mb-2 font-mono">Hidden from inbox until:</p>
                  <input
                    type="date"
                    className="no-drag bg-transparent text-sm text-[var(--c-t1)] outline-none"
                    value={startInput}
                    onChange={e => {
                      setStartInput(e.target.value)
                      store.updateTask(task.id, { startDate: e.target.value || null })
                      setShowStartPicker(false)
                    }}
                  />
                  <button
                    className="no-drag block w-full text-center text-xs text-[var(--c-danger)] mt-2 hover:opacity-80 transition-opacity"
                    onClick={() => {
                      store.updateTask(task.id, { startDate: null })
                      setStartInput('')
                      setShowStartPicker(false)
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes — writes directly to store on every keystroke, no save step */}
          <div className="flex-1 px-6 pb-6 flex flex-col gap-2 overflow-hidden">
            <label className="text-xs text-[var(--c-t6)] font-medium uppercase tracking-wider">Notes</label>
            <textarea
              ref={notesRef}
              className="no-drag flex-1 bg-transparent text-sm text-[var(--c-t3)] outline-none resize-none placeholder:text-[var(--c-t8)] leading-relaxed"
              placeholder="Add notes…"
              value={task.notes}
              onChange={e => store.updateTask(task.id, { notes: e.target.value })}
            />
          </div>

          {/* Keyboard hints only — no action buttons */}
          <div className="px-6 pb-4 flex gap-4 text-[10px] text-[var(--c-t8)] font-mono border-t border-[var(--c-b1)] pt-3">
            <span>⌘↩ close</span>
            <span>⌘⇧, priority</span>
            <span>⎋ close</span>
          </div>
        </div>
      )}
    </>
  )
}
