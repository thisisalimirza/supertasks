import { useState, useEffect } from 'react'
import { useTaskStore } from '../../store/taskStore'
import { addDays, nextSaturday, nextMonday, format } from 'date-fns'

interface Props {
  taskId: string
}

function toISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

const today = () => new Date()

const PRESETS = [
  { label: 'Today',        key: 't', getValue: () => toISO(today()),              hint: format(today(), 'EEE') },
  { label: 'Tomorrow',     key: 'm', getValue: () => toISO(addDays(today(), 1)),  hint: format(addDays(today(), 1), 'EEE') },
  { label: 'This Weekend', key: 'w', getValue: () => toISO(nextSaturday(today())), hint: format(nextSaturday(today()), 'EEE, MMM d') },
  { label: 'Next Week',    key: 'n', getValue: () => toISO(nextMonday(today())),  hint: format(nextMonday(today()), 'EEE, MMM d') },
  { label: '2 Weeks',      key: '2', getValue: () => toISO(addDays(today(), 14)), hint: format(addDays(today(), 14), 'MMM d') },
  { label: 'No Date',      key: 'x', getValue: () => null,                        hint: 'Remove' },
]

// Letter shortcut → preset index
const LETTER_MAP: Record<string, number> = { t: 0, m: 1, w: 2, n: 3, '2': 4, x: 5 }

export default function DueDatePicker({ taskId }: Props) {
  const store = useTaskStore()
  const [activeIdx, setActiveIdx] = useState(0)
  const bulkCount = store.selectedTaskIds.size

  const commit = (value: string | null) => {
    const ids = bulkCount > 0 ? Array.from(store.selectedTaskIds) : [taskId]
    ids.forEach(id => store.updateTask(id, { dueDate: value }))
    store.closePicker()
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const lk = e.key.toLowerCase()
      if (lk in LETTER_MAP) { e.preventDefault(); e.stopPropagation(); const i = LETTER_MAP[lk]; setActiveIdx(i); commit(PRESETS[i].getValue()); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setActiveIdx(i => Math.min(i + 1, PRESETS.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); setActiveIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); commit(PRESETS[activeIdx].getValue()) }
      if (e.key === 'Escape') { e.stopPropagation(); store.closePicker() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [activeIdx])

  return (
    <div className="overflow-hidden border-b border-[var(--c-b1)]">
      <div className="px-6 py-2 bg-[var(--c-elevated)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold text-[var(--c-t7)] uppercase tracking-widest">Set Due Date</span>
          {bulkCount > 0 && (
            <span className="text-[10px] font-mono text-[var(--c-accent)] bg-[var(--c-sel)] px-1.5 py-0.5 rounded">{bulkCount} tasks</span>
          )}
        </div>
        {PRESETS.map((preset, i) => (
          <button
            key={preset.key}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
              i === activeIdx ? 'bg-[var(--c-sel)] text-[var(--c-t1)]' : 'text-[var(--c-t3)] hover:bg-[var(--c-btn)]'
            }`}
            onMouseEnter={() => setActiveIdx(i)}
            onClick={() => commit(preset.getValue())}
          >
            <div className="flex items-center gap-2">
              <kbd className="text-[9px] font-mono text-[var(--c-t7)] bg-[var(--c-btn)] px-1 py-0.5 rounded w-4 text-center">{preset.key}</kbd>
              <span className={preset.key === 'x' ? 'text-[var(--c-danger)]' : ''}>{preset.label}</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--c-t6)]">{preset.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
