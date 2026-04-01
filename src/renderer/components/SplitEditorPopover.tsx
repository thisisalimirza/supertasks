import { useState, useEffect, useRef } from 'react'
import { useTaskStore } from '../store/taskStore'
import type { SplitRules, TaskPriority } from '../types/task'
import { SPLIT_VIEW_SOFT_LIMIT } from './SettingsPanel'

// ── Local rule row model ──────────────────────────────────────────────────────
type ConditionField = 'project' | 'label' | 'priority' | 'starred' | 'dueBefore' | 'dueAfter'

interface ConditionRow {
  id: string
  field: ConditionField
  value: string
}

const FIELD_LABELS: Record<ConditionField, string> = {
  project: 'Project',
  label: 'Label',
  priority: 'Priority',
  starred: 'Starred',
  dueBefore: 'Due before',
  dueAfter: 'Due after',
}

const PRIORITY_OPTIONS: TaskPriority[] = ['urgent', 'high', 'medium', 'low', 'none']

function makeRow(field: ConditionField = 'priority'): ConditionRow {
  const defaults: Record<ConditionField, string> = {
    priority: 'urgent', project: '', label: '', starred: 'true', dueBefore: '', dueAfter: '',
  }
  return { id: Math.random().toString(36).slice(2), field, value: defaults[field] }
}

// Compile condition rows → SplitRules
function rowsToRules(rows: ConditionRow[]): SplitRules {
  return {
    projects: rows.filter(r => r.field === 'project' && r.value).map(r => r.value),
    labels: rows.filter(r => r.field === 'label' && r.value).map(r => r.value),
    priorities: rows.filter(r => r.field === 'priority').map(r => r.value as TaskPriority),
    dueBefore: rows.find(r => r.field === 'dueBefore')?.value || null,
    dueAfter: rows.find(r => r.field === 'dueAfter')?.value || null,
    starred: (() => { const r = rows.find(r => r.field === 'starred'); return r ? r.value === 'true' : null })(),
  }
}

// Decompose SplitRules → condition rows
function rulesToRows(rules: SplitRules): ConditionRow[] {
  const rows: ConditionRow[] = []
  rules.projects.forEach(v => rows.push({ id: Math.random().toString(36).slice(2), field: 'project', value: v }))
  rules.labels.forEach(v => rows.push({ id: Math.random().toString(36).slice(2), field: 'label', value: v }))
  rules.priorities.forEach(v => rows.push({ id: Math.random().toString(36).slice(2), field: 'priority', value: v }))
  if (rules.dueBefore) rows.push({ id: Math.random().toString(36).slice(2), field: 'dueBefore', value: rules.dueBefore })
  if (rules.dueAfter) rows.push({ id: Math.random().toString(36).slice(2), field: 'dueAfter', value: rules.dueAfter })
  if (rules.starred !== null) rows.push({ id: Math.random().toString(36).slice(2), field: 'starred', value: String(rules.starred) })
  return rows
}

function getSplitTypeLabel(rules: import('../types/task').SplitRules): string {
  const active = [
    rules.projects.length > 0,
    rules.labels.length > 0,
    rules.priorities.length > 0,
    rules.starred !== null,
    !!(rules.dueBefore || rules.dueAfter),
  ].filter(Boolean).length

  if (active !== 1) return 'View'
  if (rules.projects.length > 0)   return 'Project View'
  if (rules.labels.length > 0)     return 'Label View'
  if (rules.priorities.length > 0) return 'Priority View'
  if (rules.starred !== null)      return 'Starred View'
  return 'Date View'
}

export default function SplitEditorPopover() {
  const store = useTaskStore()
  const editingSplit = store.editingSplitId ? store.splits.find(s => s.id === store.editingSplitId) : null
  const isEditing = !!editingSplit
  const intent = store.splitEditorIntent  // 'split' | 'filter'
  const isFilter = intent === 'filter' && !isEditing
  const existingCount = store.splits.filter(s => s.enabled).length
  const overLimit = !isEditing && existingCount >= SPLIT_VIEW_SOFT_LIMIT

  const [name, setName] = useState(editingSplit?.name ?? '')
  const [conditions, setConditions] = useState<ConditionRow[]>(
    editingSplit ? rulesToRows(editingSplit.rules) : [makeRow()]
  )
  const [operator, setOperator] = useState<'AND' | 'OR'>(editingSplit?.ruleOperator ?? 'AND')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); store.setSplitEditorOpen(false) }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  const close = () => store.setSplitEditorOpen(false)

  const save = async () => {
    const rules = rowsToRules(conditions)
    // In filter mode, auto-generate a name from the first rule
    let trimmed = name.trim()
    if (isFilter && !trimmed) {
      const first = conditions[0]
      if (first) {
        const fieldLabel = FIELD_LABELS[first.field]
        trimmed = first.value ? `${fieldLabel}: ${first.value}` : fieldLabel
      } else {
        trimmed = 'Filter'
      }
    }
    if (!trimmed) { nameRef.current?.focus(); return }
    if (isEditing) {
      await store.updateSplit(editingSplit!.id, { name: trimmed, rules, ruleOperator: operator })
    } else {
      const split = await store.createSplit({ name: trimmed, rules, ruleOperator: operator, enabled: true })
      store.setActiveSplit(split.id)
    }
    close()
  }

  const updateRow = (id: string, patch: Partial<ConditionRow>) => {
    setConditions(rows => rows.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, ...patch }
      // Reset value when field type changes
      if (patch.field && patch.field !== r.field) {
        const defaults: Record<ConditionField, string> = {
          priority: 'urgent', project: '', label: '', starred: 'true', dueBefore: '', dueAfter: '',
        }
        updated.value = defaults[patch.field]
      }
      return updated
    }))
  }

  const removeRow = (id: string) => setConditions(rows => rows.filter(r => r.id !== id))
  const addRow = () => setConditions(rows => [...rows, makeRow()])

  const allEmpty = conditions.length === 0

  const projectNames = store.getAllProjectNames()
  const allLabels = store.getAllLabels()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onClick={close}>
      <div
        className="w-[520px] bg-[var(--c-surface)] border border-[var(--c-b2)] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--c-b1)]">
          <h2 className="text-sm font-semibold text-[var(--c-t1)] mb-3">
            {isEditing ? 'Edit View' : isFilter ? 'Filter Tasks' : 'New View'}
          </h2>
          {/* Name field — hidden in filter mode (auto-named from rules) */}
          {!isFilter && (
            <input
              ref={nameRef}
              className="w-full bg-[var(--c-btn)] text-sm text-[var(--c-t1)] placeholder:text-[var(--c-t7)] rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-[var(--c-accent)] transition"
              placeholder="Name (e.g. Urgent, Work, Waiting)"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
            />
          )}
          {overLimit && (
            <p className="mt-2 text-[10px] text-[var(--c-t6)] leading-relaxed">
              You already have {existingCount} views. More than {SPLIT_VIEW_SOFT_LIMIT} can fragment your focus — consider consolidating before adding more.
            </p>
          )}
        </div>

        {/* Rules */}
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-semibold text-[var(--c-t7)] uppercase tracking-widest">Filter Rules</span>
            {conditions.length > 1 && (
              <div className="flex items-center gap-1 bg-[var(--c-btn)] rounded-md p-0.5">
                {(['AND', 'OR'] as const).map(op => (
                  <button
                    key={op}
                    onClick={() => setOperator(op)}
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded transition-colors ${
                      operator === op ? 'bg-[var(--c-sel)] text-[var(--c-accent)]' : 'text-[var(--c-t6)]'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
          </div>

          {conditions.map((row, i) => (
            <div key={row.id} className="flex items-center gap-2">
              {/* AND/OR label between rows */}
              {i > 0 && (
                <span className="text-[9px] font-mono text-[var(--c-t7)] w-6 text-right shrink-0">{operator}</span>
              )}
              {i === 0 && <span className="w-6 shrink-0" />}

              {/* Field selector */}
              <select
                value={row.field}
                onChange={e => updateRow(row.id, { field: e.target.value as ConditionField })}
                className="bg-[var(--c-btn)] text-xs text-[var(--c-t2)] rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--c-accent)] cursor-pointer"
              >
                {(Object.keys(FIELD_LABELS) as ConditionField[]).map(f => (
                  <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                ))}
              </select>

              {/* Value input — changes by field type */}
              <div className="flex-1">
                {row.field === 'priority' && (
                  <select
                    value={row.value}
                    onChange={e => updateRow(row.id, { value: e.target.value })}
                    className="w-full bg-[var(--c-btn)] text-xs text-[var(--c-t2)] rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--c-accent)] cursor-pointer"
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                )}
                {row.field === 'starred' && (
                  <select
                    value={row.value}
                    onChange={e => updateRow(row.id, { value: e.target.value })}
                    className="w-full bg-[var(--c-btn)] text-xs text-[var(--c-t2)] rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--c-accent)] cursor-pointer"
                  >
                    <option value="true">Starred only</option>
                    <option value="false">Unstarred only</option>
                  </select>
                )}
                {(row.field === 'dueBefore' || row.field === 'dueAfter') && (
                  <input
                    type="date"
                    value={row.value}
                    onChange={e => updateRow(row.id, { value: e.target.value })}
                    className="w-full bg-[var(--c-btn)] text-xs text-[var(--c-t2)] rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--c-accent)]"
                  />
                )}
                {row.field === 'project' && (
                  <input
                    type="text"
                    value={row.value}
                    onChange={e => updateRow(row.id, { value: e.target.value })}
                    placeholder="Project name"
                    list={`projects-${row.id}`}
                    className="w-full bg-[var(--c-btn)] text-xs text-[var(--c-t2)] rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--c-accent)] placeholder:text-[var(--c-t7)]"
                  />
                )}
                {row.field === 'label' && (
                  <input
                    type="text"
                    value={row.value}
                    onChange={e => updateRow(row.id, { value: e.target.value })}
                    placeholder="Label name"
                    list={`labels-${row.id}`}
                    className="w-full bg-[var(--c-btn)] text-xs text-[var(--c-t2)] rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-[var(--c-accent)] placeholder:text-[var(--c-t7)]"
                  />
                )}
              </div>

              {/* Remove row */}
              <button
                onClick={() => removeRow(row.id)}
                className="no-drag text-[var(--c-t7)] hover:text-[var(--c-danger)] transition-colors text-sm shrink-0"
              >
                ×
              </button>
            </div>
          ))}

          {/* Datalists for autocomplete */}
          {conditions.filter(r => r.field === 'project').map(r => (
            <datalist key={`projects-${r.id}`} id={`projects-${r.id}`}>
              {projectNames.map(p => <option key={p} value={p} />)}
            </datalist>
          ))}
          {conditions.filter(r => r.field === 'label').map(r => (
            <datalist key={`labels-${r.id}`} id={`labels-${r.id}`}>
              {allLabels.map(l => <option key={l} value={l} />)}
            </datalist>
          ))}

          {/* Add rule */}
          <button
            onClick={addRow}
            className="no-drag flex items-center gap-1.5 text-xs text-[var(--c-t6)] hover:text-[var(--c-accent)] transition-colors mt-1"
          >
            <span className="text-base leading-none">+</span>
            Add rule
          </button>

          {/* All-tasks warning */}
          {allEmpty && (
            <p className="text-[10px] text-[var(--c-warn)] mt-2">
              ⚠ No rules — this split will show all tasks
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--c-b1)]">
          <div className="flex items-center gap-3">
            <button
              onClick={close}
              className="no-drag text-xs text-[var(--c-t6)] hover:text-[var(--c-t3)] transition-colors font-mono"
            >
              ⎋ Cancel
            </button>
            {isEditing && editingSplit && (
              <button
                onClick={() => { store.deleteSplit(editingSplit.id); close() }}
                className="no-drag text-xs text-[var(--c-t7)] hover:text-[var(--c-danger)] transition-colors"
              >
                Delete {getSplitTypeLabel(editingSplit.rules)}
              </button>
            )}
          </div>
          <button
            onClick={save}
            className="no-drag px-4 py-1.5 bg-[var(--c-accent)] text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            {isEditing ? 'Save Changes' : isFilter ? 'Apply Filter' : 'Create View'}
          </button>
        </div>
      </div>
    </div>
  )
}
