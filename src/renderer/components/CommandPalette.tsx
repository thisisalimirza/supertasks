import { useState, useEffect, useRef } from 'react'
import Fuse from 'fuse.js'
import { useTaskStore } from '../store/taskStore'
import type { ShortcutDef } from '../hooks/useKeyboard'

type ItemType = 'create' | 'navigate' | 'action' | 'result' | 'setting'

interface CommandItem {
  id: string
  label: string
  description?: string
  notes?: string
  group: string
  type?: ItemType
  action: () => void
}

// ── Leading indicator: + for create, → for navigate, blank for everything else
const VERB_STYLE = "w-10 shrink-0 text-[9px] font-medium leading-none tracking-wide uppercase"

function ItemIcon({ type }: { type?: ItemType }) {
  if (type === 'create')   return <span className={`${VERB_STYLE} text-[var(--c-accent)]`}>new</span>
  if (type === 'navigate') return <span className={`${VERB_STYLE} text-[var(--c-t8)]`}>go to</span>
  if (type === 'result')   return <span className={`${VERB_STYLE} text-[var(--c-t8)]`}>open</span>
  if (type === 'setting')  return <span className={`${VERB_STYLE} text-[var(--c-t8)]`}>open</span>
  return <span className="w-10 shrink-0" />
}

interface Props {
  shortcuts: ShortcutDef[]
}

export default function CommandPalette({ shortcuts }: Props) {
  const store = useTaskStore()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Global Escape listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  const close = () => store.setCommandPaletteOpen(false)

  // Resolved outside buildItems so grouped logic can reference it too
  const selectedTask = store.getVisibleTasks()[store.selectedIndex] ?? null

  const buildItems = (): CommandItem[] => {
    const items: CommandItem[] = []

    // ── Task-context actions — first in the list so they surface at top when no query ──
    if (selectedTask) {
      const isDone = selectedTask.status === 'done'
      items.push(
        { id: 'task-done',     label: isDone ? 'Mark incomplete' : 'Mark as done', notes: 'done complete finish check toggle status', group: 'Task', type: 'action', action: () => { store.toggleDone(selectedTask.id); close() } },
        { id: 'task-star',     label: selectedTask.starred ? 'Unstar' : 'Star task', notes: 'star flag priority favourite', group: 'Task', type: 'action', action: () => { store.toggleStar(selectedTask.id); close() } },
        { id: 'task-priority', label: 'Cycle priority',  notes: 'priority urgent high medium low', group: 'Task', type: 'action', action: () => { store.cyclePriority(selectedTask.id); close() } },
        { id: 'task-due',      label: 'Set due date',    notes: 'due date deadline when schedule', group: 'Task', type: 'action', action: () => { store.setActivePicker('due', selectedTask.id); close() } },
        { id: 'task-start',    label: 'Set start date',  notes: 'hold until start begin later snooze', group: 'Task', type: 'action', action: () => { store.setActivePicker('startDate', selectedTask.id); close() } },
        { id: 'task-labels',   label: 'Edit labels',     notes: 'labels tags categories add remove', group: 'Task', type: 'action', action: () => { store.setActivePicker('label', selectedTask.id); close() } },
        { id: 'task-project',  label: 'Assign project',  notes: 'project assign move set', group: 'Task', type: 'action', action: () => { store.setActivePicker('project', selectedTask.id); close() } },
        { id: 'task-delete',   label: 'Delete task',     notes: 'delete remove trash', group: 'Task', type: 'action', action: () => { store.deleteTask(selectedTask.id); close() } },
      )
    }

    // ── Go To — built-in views only (projects live in the Projects group below) ─
    items.push(
      { id: 'view-inbox',    label: 'Inbox',     group: 'Go To', type: 'navigate', action: () => { store.setView('inbox');    close() } },
      { id: 'view-today',    label: 'Today',     group: 'Go To', type: 'navigate', action: () => { store.setView('today');    close() } },
      { id: 'view-tomorrow', label: 'Tomorrow',  group: 'Go To', type: 'navigate', action: () => { store.setView('tomorrow'); close() } },
      { id: 'view-week',     label: 'This Week', group: 'Go To', type: 'navigate', action: () => { store.setView('week');     close() } },
      { id: 'view-all',      label: 'All Tasks', group: 'Go To', type: 'navigate', action: () => { store.setView('all');      close() } },
      { id: 'view-done',     label: 'Done',      group: 'Go To', type: 'navigate', action: () => { store.setView('done');     close() } },
    )
    store.splits.filter(s => s.enabled).forEach(split => {
      items.push({
        id: `view-split-${split.id}`,
        label: split.name,
        description: 'View',
        group: 'Go To',
        type: 'navigate',
        action: () => { store.setActiveSplit(split.id); close() },
      })
    })

    // ── Projects ──────────────────────────────────────────────────────────────
    items.push({
      id: 'project-new',
      label: 'New Project',
      description: 'Create a project',
      group: 'Projects',
      type: 'create',
      action: () => { store.setNewProjectOpen(true); close() },
    })
    store.getAllProjectNames().forEach(name => {
      items.push({
        id: `project-go-${name}`,
        label: name,
        description: 'Project',
        group: 'Projects',
        type: 'navigate',
        action: () => { store.navigateToProject(name); close() },
      })
    })

    // ── Filters ───────────────────────────────────────────────────────────────
    items.push(
      { id: 'filter-new',      label: 'New Filter',          description: 'Filter current tasks', group: 'Filters', type: 'navigate', action: () => { store.setSplitEditorOpen(true, null, 'filter'); close() } },
      { id: 'filter-priority', label: 'Filter by Priority',  group: 'Filters', type: 'navigate', action: () => { store.setSplitEditorOpen(true, null, 'filter'); close() } },
      { id: 'filter-label',    label: 'Filter by Label',     group: 'Filters', type: 'navigate', action: () => { store.setSplitEditorOpen(true, null, 'filter'); close() } },
      { id: 'filter-project',  label: 'Filter by Project',   group: 'Filters', type: 'navigate', action: () => { store.setSplitEditorOpen(true, null, 'filter'); close() } },
    )

    // ── Splits (power user) ───────────────────────────────────────────────────
    items.push({
      id: 'split-create',
      label: 'New Split View',
      description: 'Advanced filter tab',
      group: 'Splits',
      type: 'create',
      action: () => { store.setSplitEditorOpen(true, null); close() },
    })
    if (store.activeView === 'split' && store.activeSplitId) {
      const activeSplit = store.splits.find(s => s.id === store.activeSplitId)
      if (activeSplit) {
        items.push(
          { id: 'split-edit',    label: `Edit "${activeSplit.name}"`,    group: 'Splits', type: 'action', action: () => { store.setSplitEditorOpen(true, activeSplit.id); close() } },
          { id: 'split-disable', label: `Disable "${activeSplit.name}"`, group: 'Splits', type: 'action', action: () => { store.updateSplit(activeSplit.id, { enabled: false }); store.setView('inbox'); close() } },
          { id: 'split-delete',  label: `Delete "${activeSplit.name}"`,  group: 'Splits', type: 'action', action: () => { store.deleteSplit(activeSplit.id); close() } },
        )
      }
    }
    store.splits.forEach(split => {
      if (store.activeSplitId === split.id) return
      items.push({ id: `split-edit-${split.id}`, label: `Edit "${split.name}"`, description: 'Split', group: 'Splits', type: 'action', action: () => { store.setSplitEditorOpen(true, split.id); close() } })
    })

    // ── Settings ──────────────────────────────────────────────────────────────
    items.push(
      { id: 'toggle-theme',        label: store.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode', description: '⌘⇧L', group: 'Settings', type: 'action',  action: () => { store.toggleTheme(); close() } },
      { id: 'open-settings',       label: 'Open Settings',                 description: '/',                              group: 'Settings', type: 'setting', action: () => { store.setSettingsOpen(true); close() } },
      { id: 'settings-appearance', label: 'Settings → Appearance',         notes: 'theme dark light mode',                group: 'Settings', type: 'setting', action: () => { store.setSettingsOpen(true); store.setSettingsSection('appearance'); close() } },
      { id: 'settings-labels',     label: 'Settings → Labels',             notes: 'manage rename delete labels tags',     group: 'Settings', type: 'setting', action: () => { store.setSettingsOpen(true); store.setSettingsSection('labels'); close() } },
      { id: 'settings-views',      label: 'Settings → Views & Projects',   notes: 'reorder views projects filters splits',group: 'Settings', type: 'setting', action: () => { store.setSettingsOpen(true); store.setSettingsSection('views'); close() } },
      { id: 'settings-data',       label: 'Settings → Data',               notes: 'clear completed delete done tasks',    group: 'Settings', type: 'setting', action: () => { store.setSettingsOpen(true); store.setSettingsSection('data'); close() } },
    )

    // ── Generic actions (keyboard shortcuts) ──────────────────────────────────
    for (const s of shortcuts) {
      if (s.key === 'k' && s.meta) continue
      if (s.key === 'l' && s.meta && s.shift) continue
      if (s.key === 'm') continue  // covered by task-project above
      if (['d','s','r','h','l','x','e','Backspace'].includes(s.key) && !s.meta) continue  // covered by Task group
      items.push({ id: `action-${s.key}-${s.meta}-${s.shift}`, label: s.description, group: 'Actions', type: 'action', action: () => { s.action(); close() } })
    }

    // ── Tasks (search results) ────────────────────────────────────────────────
    for (const task of store.tasks.slice(0, 50)) {
      items.push({
        id: `task-${task.id}`,
        label: task.title,
        description: task.project || undefined,
        notes: task.notes?.trim() || undefined,
        group: 'Tasks',
        type: 'result',
        action: () => { store.openDetail(task.id); close() },
      })
    }

    return items
  }

  const allItems = buildItems()

  // Build recently-used list
  const recentItems: CommandItem[] = store.recentCommandIds
    .map(id => allItems.find(x => x.id === id))
    .filter((x): x is CommandItem => !!x)
    .slice(0, 5)

  const filtered: CommandItem[] = query.trim()
    ? new Fuse(allItems, {
        keys: ['label', 'description', 'group', 'notes'],
        threshold: 0.4,
        minMatchCharLength: 1,
        ignoreLocation: true,
        distance: 100,
      }).search(query).map(r => r.item)
    : allItems.slice(0, 30)

  // Group results
  const grouped = (() => {
    const result: Record<string, CommandItem[]> = {}

    if (!query.trim()) {
      // No query: task context actions come first (if a task is selected), then Recent, then everything else
      const taskActions = allItems.filter(i => i.group === 'Task')
      const rest = filtered.filter(i => i.group !== 'Task')

      if (selectedTask && taskActions.length > 0) {
        const label = selectedTask.title.length > 32
          ? selectedTask.title.slice(0, 32) + '…'
          : selectedTask.title
        result[label] = taskActions
      } else if (recentItems.length > 0) {
        result['Recent'] = recentItems
      }

      rest.forEach(item => {
        if (!result[item.group]) result[item.group] = []
        result[item.group].push(item)
      })
    } else {
      // Query active: Fuse handles prioritisation, group Task items under a generic label
      filtered.forEach(item => {
        const group = item.group === 'Task' ? 'Task Actions' : item.group
        if (!result[group]) result[group] = []
        result[group].push(item)
      })
    }

    return result
  })()

  // Flat list for keyboard nav
  const flat = Object.values(grouped).flat()

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const execute = (item: CommandItem) => {
    store.addRecentCommand(item.id)
    item.action()
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); if (flat[activeIndex]) execute(flat[activeIndex]) }
    if (e.key === 'Escape') close()
  }

  let flatIdx = 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={close}>
      <div
        className="w-[600px] bg-[var(--c-surface)] border border-[var(--c-b2)] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--c-b1)]">
          <svg className="w-4 h-4 text-[var(--c-t6)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-[var(--c-t1)] outline-none placeholder:text-[var(--c-t7)]"
            placeholder="Search tasks, actions, and more…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <kbd className="text-[10px] text-[var(--c-t6)] bg-[var(--c-btn)] px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              {store.commandPaletteGroupHeaders && (
                <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--c-t7)] uppercase tracking-wider flex items-center gap-1.5">
                  {group === 'Recent' && <span className="text-[var(--c-t7)]">↺</span>}
                  {group}
                </div>
              )}
              {items.map(item => {
                const idx = flatIdx++
                return (
                  <button
                    key={item.id}
                    data-cmd-index={idx}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                      idx === activeIndex ? 'bg-[var(--c-sel)]' : 'hover:bg-[var(--c-cmd-row)]'
                    }`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => execute(item)}
                  >
                    <ItemIcon type={item.type} />
                    <span className="flex-1 text-sm text-[var(--c-t2)] truncate">{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-[var(--c-t6)] font-mono shrink-0">{item.description}</span>
                    )}
                    {idx === activeIndex && (
                      <kbd className="text-[10px] text-[var(--c-t5)] bg-[var(--c-btn)] px-1.5 py-0.5 rounded font-mono shrink-0">↵</kbd>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          {flat.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-[var(--c-t6)]">
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
