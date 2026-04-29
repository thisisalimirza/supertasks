import { useState, useRef, useEffect } from 'react'
import { useTaskStore, getProjectColor } from '../store/taskStore'
import PriorityDot from './PriorityDot'
import type { Task } from '../types/task'
import { format, parseISO } from 'date-fns'

interface Props {
  task: Task
  isSelected: boolean
  isChecked: boolean
  isDragOver?: boolean
  isDragging?: boolean
}

export default function TaskRow({ task, isSelected, isChecked, isDragOver, isDragging }: Props) {
  const store = useTaskStore()
  const isEditing = store.editingTaskId === task.id
  const isCompleting = store.completingTaskId === task.id
  const [editValue, setEditValue] = useState(task.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEditing) {
      setEditValue(task.title)
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }, [isEditing, task.title])

  // Slide-away animation when task is being marked done
  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    if (isCompleting) {
      el.style.transition = 'transform 200ms ease-in, opacity 160ms ease-in'
      el.style.transform = 'translateX(48px)'
      el.style.opacity = '0'
      el.style.pointerEvents = 'none'
    } else {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
      el.style.pointerEvents = ''
    }
  }, [isCompleting])

  const commitEdit = () => {
    if (editValue.trim()) {
      store.updateTask(task.id, { title: editValue.trim() })
    }
    store.setEditingTaskId(null)
  }

  const isDone = task.status === 'done'
  const projectColor = getProjectColor(task.project, store.projects)

  return (
    <div
      ref={rowRef}
      className={`
        group relative flex items-center gap-3 px-6 py-3 cursor-pointer
        border-b border-[var(--c-b0)]
        ${isSelected || isChecked ? 'bg-[var(--c-sel)]' : 'hover:bg-[var(--c-hover)]'}
        ${isDone ? 'opacity-50' : ''}
        ${isDragging ? 'opacity-30' : ''}
        ${isDragOver ? 'border-t-2 border-t-[var(--c-accent)]' : ''}
      `}
      onClick={() => {
        store.setSelectedIndex(store.getVisibleTasks().findIndex(t => t.id === task.id))
        store.openDetail(task.id)
      }}
    >
      {/* Project color bar */}
      {projectColor && (
        <div className="absolute left-0 top-0 bottom-0 w-1 opacity-70" style={{ backgroundColor: projectColor }} />
      )}
      {/* Selection indicator — only shown when no project color (row bg already shows selection) */}
      {isSelected && !projectColor && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--c-accent)]" />
      )}

      {/* Checkbox */}
      <button
        className="no-drag shrink-0 w-4 h-4 rounded-full border border-[var(--c-b3)] flex items-center justify-center transition-all hover:border-[var(--c-accent)]"
        onClick={(e) => {
          e.stopPropagation()
          store.toggleDone(task.id)
        }}
      >
        {isDone && (
          <svg className="w-2.5 h-2.5 text-[var(--c-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Bulk select checkbox */}
      <button
        className={`no-drag shrink-0 w-3.5 h-3.5 rounded border transition-all
          ${isChecked ? 'bg-[var(--c-accent)] border-[var(--c-accent)]' : 'border-[var(--c-b3)] opacity-0 group-hover:opacity-100'}
        `}
        onClick={(e) => {
          e.stopPropagation()
          store.toggleSelectTask(task.id)
        }}
      >
        {isChecked && (
          <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Priority dot */}
      <PriorityDot priority={task.priority} />

      {/* Title + notes preview */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            className="no-drag w-full bg-transparent text-sm text-[var(--c-t1)] outline-none border-b border-[var(--c-accent)] pb-0.5"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
              if (e.key === 'Escape') { e.preventDefault(); store.setEditingTaskId(null) }
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-baseline gap-4 min-w-0">
            {/* Title: no artificial width cap — takes all available space and truncates */}
            <span className={`text-sm min-w-0 truncate ${isDone ? 'line-through text-[var(--c-t6)]' : 'text-[var(--c-t1)]'}`}>
              {task.title}
            </span>
            {/* Notes: secondary metadata — capped at 40% so it never crowds the title */}
            {task.notes?.trim() && (
              <span className="text-xs text-[var(--c-t7)] truncate shrink-0 max-w-[40%]">
                {task.notes.trim().replace(/\n/g, ' · ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-2 shrink-0">
        {task.starred && <span className="text-[var(--c-warn)] text-xs">★</span>}
        {task.labels.slice(0, 2).map(label => (
          <span key={label} className="text-[10px] font-mono text-[var(--c-t6)] bg-[var(--c-btn)] px-1.5 py-0.5 rounded">
            {label}
          </span>
        ))}
        {task.project && (
          <span className="text-[10px] text-[var(--c-t7)] font-mono bg-[var(--c-btn)] px-1.5 py-0.5 rounded">
            {task.project}
          </span>
        )}
        {task.dueDate && (
          <span className={`text-[10px] font-mono ${
            new Date(task.dueDate) < new Date() && !isDone ? 'text-[var(--c-danger)]' : 'text-[var(--c-t6)]'
          }`}>
            {format(parseISO(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  )
}
