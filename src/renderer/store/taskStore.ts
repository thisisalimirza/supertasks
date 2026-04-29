import { create } from 'zustand'
import { nanoid } from './nanoid'
import type { Task, TaskPriority, TaskView, Project, Split, SplitRules } from '../types/task'
import { isToday, isPast, isFuture, parseISO, startOfDay, format, addDays } from 'date-fns'

type PickerType = 'due' | 'startDate' | 'label' | 'project' | null

// ── Project color palette ─────────────────────────────────────────────────────
export const PROJECT_COLORS = [
  '#5E81F4', // indigo
  '#E9507E', // rose
  '#44BBA4', // teal
  '#F5A623', // amber
  '#8B5CF6', // violet
  '#3ABFF8', // sky
  '#F97316', // orange
  '#22C55E', // green
  '#EC4899', // pink
  '#06B6D4', // cyan
]

export function getProjectColor(projectName: string, projects: Project[]): string | null {
  if (!projectName) return null
  const proj = projects.find(p => p.name === projectName)
  if (proj?.color) return proj.color
  // Fallback: deterministic hash for projects without a record
  let hash = 0
  for (let i = 0; i < projectName.length; i++) hash = (hash * 31 + projectName.charCodeAt(i)) >>> 0
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}

export type TabEntry =
  | { type: 'builtin'; view: Exclude<TaskView, 'project' | 'split'> }
  | { type: 'split'; id: string }

// ── Undo / Toast ──────────────────────────────────────────────────────────────
export interface UndoEntry {
  id: string
  description: string
  perform: () => Promise<void>
}

export interface Toast {
  id: string
  message: string
  undoId?: string   // links to an undo entry
}

interface TaskStore {
  tasks: Task[]
  projects: Project[]
  splits: Split[]
  selectedIndex: number
  selectedTaskId: string | null
  selectedTaskIds: Set<string>
  activeView: TaskView
  activeSplitId: string | null
  isDetailOpen: boolean
  isCommandPaletteOpen: boolean
  isShortcutCheatsheetOpen: boolean
  isProjectNavOpen: boolean
  isSplitEditorOpen: boolean
  editingSplitId: string | null
  splitEditorIntent: 'split' | 'filter'
  isNewProjectOpen: boolean
  isCreating: boolean
  editingTaskId: string | null
  completingTaskId: string | null
  theme: 'dark' | 'light'
  commandPaletteGroupHeaders: boolean
  activePicker: PickerType
  pickerTaskId: string | null
  recentCommandIds: string[]
  selectedProject: string | null
  undoStack: UndoEntry[]
  toasts: Toast[]

  loadTasks: () => Promise<void>

  // CRUD
  createTask: (title: string, defaults?: Partial<Pick<Task, 'dueDate' | 'startDate' | 'project' | 'status' | 'labels' | 'priority'>>) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  deleteBulkTasks: (ids: string[]) => Promise<void>
  toggleDone: (id: string) => Promise<void>
  toggleStar: (id: string) => Promise<void>
  cyclePriority: (id: string) => Promise<void>

  // Navigation
  setSelectedIndex: (index: number) => void
  moveSelection: (dir: 1 | -1) => void
  openDetail: (id: string) => void
  closeDetail: () => void
  setView: (view: Exclude<TaskView, 'project' | 'split'>) => void

  // Selection
  toggleSelectTask: (id: string) => void
  clearSelection: () => void
  extendSelection: (dir: 1 | -1) => void
  selectionAnchor: number | null

  // UI state
  setCreating: (v: boolean) => void
  setEditingTaskId: (id: string | null) => void
  setCommandPaletteOpen: (v: boolean) => void
  setShortcutCheatsheetOpen: (v: boolean) => void
  setProjectNavOpen: (v: boolean) => void
  setSplitEditorOpen: (open: boolean, splitId?: string | null, intent?: 'split' | 'filter') => void
  setNewProjectOpen: (v: boolean) => void
  toggleTheme: () => void
  setCommandPaletteGroupHeaders: (v: boolean) => void

  // Pickers
  setActivePicker: (type: PickerType, taskId?: string) => void
  closePicker: () => void

  // Undo / Toast
  pushUndo: (entry: UndoEntry) => void
  undo: () => Promise<void>
  addToast: (message: string, undoId?: string) => void
  dismissToast: (id: string) => void

  // Recent commands
  addRecentCommand: (id: string) => void

  // Label helpers
  getAllLabels: () => string[]
  toggleLabel: (taskId: string, label: string) => Promise<void>

  // Project helpers
  getAllProjectNames: () => string[]
  setTaskProject: (taskId: string, projectName: string) => Promise<void>
  navigateToProject: (projectName: string) => void
  /** Bulk-rename every task whose project matches oldName, then fix any split rules that referenced it */
  renameProject: (oldName: string, newName: string) => Promise<void>

  // Splits
  createSplit: (draft: Omit<Split, 'id' | 'createdAt' | 'sortOrder'>) => Promise<Split>
  updateSplit: (id: string, updates: Partial<Omit<Split, 'id' | 'createdAt'>>) => Promise<void>
  deleteSplit: (id: string) => Promise<void>
  setActiveSplit: (id: string) => void
  moveSplit: (id: string, dir: 'left' | 'right') => Promise<void>

  // Tab ordering
  getOrderedTabs: () => TabEntry[]
  navigateToTab: (tab: TabEntry) => void
  navigateTabRelative: (dir: 1 | -1) => void

  // Reorder
  reorderTask: (id: string, dir: 1 | -1) => Promise<void>
  moveTaskToPosition: (sourceId: string, targetId: string) => Promise<void>

  // Show-completed toggle (project / split views only)
  showCompletedInView: boolean
  setShowCompletedInView: (v: boolean) => void

  // Onboarding
  onboardingCompleted: boolean
  completeOnboarding: (withDemoData: boolean) => Promise<void>

  // Settings
  isSettingsOpen: boolean
  settingsSection: string | null
  setSettingsOpen: (v: boolean) => void
  setSettingsSection: (section: string | null) => void
  renameLabel: (oldName: string, newName: string) => Promise<void>
  deleteLabel: (name: string) => Promise<void>

  // Computed
  getVisibleTasks: () => Task[]
  getSplitTaskCount: (splitId: string) => number
}

const PRIORITY_CYCLE: TaskPriority[] = ['none', 'low', 'medium', 'high', 'urgent']
const BUILTIN_VIEWS = ['inbox', 'today', 'upcoming', 'all', 'done'] as const

function loadRecentCmds(): string[] {
  try { return JSON.parse(localStorage.getItem('supertasks-recent-cmds') ?? '[]') } catch { return [] }
}
function saveRecentCmds(ids: string[]) {
  localStorage.setItem('supertasks-recent-cmds', JSON.stringify(ids))
}

// Returns true if the task's startDate is in the future (task should be hidden)
function hasUpcomingStart(task: Task): boolean {
  if (!task.startDate) return false
  return isFuture(startOfDay(parseISO(task.startDate)))
}

// ── Split filter ──────────────────────────────────────────────────────────────
function applySplitFilter(tasks: Task[], split: Split): Task[] {
  const base = tasks.filter(t => t.status !== 'archived')
  const { rules, ruleOperator } = split
  const matchers: Array<(t: Task) => boolean> = []
  if (rules.projects.length > 0)   matchers.push(t => rules.projects.includes(t.project))
  if (rules.labels.length > 0)     matchers.push(t => t.labels.some(l => rules.labels.includes(l)))
  if (rules.priorities.length > 0) matchers.push(t => rules.priorities.includes(t.priority))
  if (rules.dueBefore)             matchers.push(t => !!t.dueDate && t.dueDate < rules.dueBefore!)
  if (rules.dueAfter)              matchers.push(t => !!t.dueDate && t.dueDate > rules.dueAfter!)
  if (rules.starred !== null)      matchers.push(t => t.starred === rules.starred)
  if (matchers.length === 0) return base
  return base.filter(t =>
    ruleOperator === 'AND' ? matchers.every(m => m(t)) : matchers.some(m => m(t))
  )
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [], projects: [], splits: [],
  selectedIndex: 0, selectedTaskId: null, selectedTaskIds: new Set(), selectionAnchor: null,
  activeView: 'inbox', activeSplitId: null,
  isDetailOpen: false, isCommandPaletteOpen: false, isShortcutCheatsheetOpen: false,
  isProjectNavOpen: false, isSplitEditorOpen: false, editingSplitId: null, splitEditorIntent: 'split' as const,
  isNewProjectOpen: false, isSettingsOpen: false, settingsSection: null,
  isCreating: false, editingTaskId: null, completingTaskId: null,
  showCompletedInView: false,
  onboardingCompleted: false,
  theme: (localStorage.getItem('supertasks-theme') as 'dark' | 'light') ?? 'light',
  commandPaletteGroupHeaders: localStorage.getItem('supertasks-cmd-headers') === 'true',
  activePicker: null, pickerTaskId: null,
  recentCommandIds: loadRecentCmds(), selectedProject: null,
  undoStack: [], toasts: [],

  loadTasks: async () => {
    const [tasks, projects, splits, onboardingCompleted] = await Promise.all([
      window.api.tasks.getAll(),
      window.api.projects.getAll(),
      window.api.splits.getAll(),
      window.api.onboarding.getStatus(),
    ])
    // ── Backfill: assign sortOrder to tasks that predate the field ──
    // Use createdAt timestamp so natural order is preserved
    const backfilled = tasks.map(t =>
      t.sortOrder != null ? t : { ...t, sortOrder: new Date(t.createdAt).getTime() }
    )
    set({ tasks: backfilled, projects, splits, onboardingCompleted })

    // ── Backfill: create splits for any project that doesn't have one yet ──
    // Covers tasks that had projects assigned before this feature existed.
    const coveredProjects = new Set(splits.flatMap(s => s.rules.projects))
    const allProjectNames = [...new Set(tasks.map(t => t.project).filter(Boolean))]
    const missing = allProjectNames.filter(name => !coveredProjects.has(name))

    if (missing.length > 0) {
      const maxOrder = splits.reduce((m, s) => Math.max(m, s.sortOrder), -1)
      const newSplits: Split[] = missing.map((name, i) => ({
        id: nanoid(),
        name,
        rules: { projects: [name], labels: [], priorities: [], dueBefore: null, dueAfter: null, starred: null },
        ruleOperator: 'AND' as const,
        enabled: true,
        sortOrder: maxOrder + 1 + i,
        createdAt: new Date().toISOString(),
      }))
      // Optimistic update then persist
      set(s => ({ splits: [...s.splits, ...newSplits] }))
      await Promise.all(newSplits.map(sp => window.api.splits.create(sp)))
    }
  },

  createTask: async (title: string, defaults = {}) => {
    const task: Task = {
      id: nanoid(), title, notes: '', status: 'inbox', priority: 'none',
      dueDate: null, startDate: null, reminder: null, project: '', labels: [],
      createdAt: new Date().toISOString(), completedAt: null, starred: false,
      sortOrder: Date.now(),
      ...defaults,
    }
    set(s => ({ tasks: [task, ...s.tasks] }))
    await window.api.tasks.create(task)
    return task
  },

  updateTask: async (id, updates) => {
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }))
    const updated = get().tasks.find(t => t.id === id)!
    await window.api.tasks.update(updated)
  },

  reorderTask: async (id, dir) => {
    // Don't allow reordering in views with semantic sorts
    const { activeView, selectedTaskIds } = get()
    if (activeView === 'upcoming' || activeView === 'done') return

    const visible = get().getVisibleTasks()

    // Determine which tasks to move: the whole selected group, or just the one task
    const idsToMove = selectedTaskIds.size > 0 && selectedTaskIds.has(id)
      ? visible.filter(t => selectedTaskIds.has(t.id)).map(t => t.id)
      : [id]

    // Find their sorted indices in the visible list
    const groupIndices = idsToMove
      .map(tid => visible.findIndex(t => t.id === tid))
      .filter(i => i >= 0)
      .sort((a, b) => a - b)

    if (groupIndices.length === 0) return
    const from = groupIndices[0]
    const to   = groupIndices[groupIndices.length - 1]

    if (dir === 1  && to   >= visible.length - 1) return
    if (dir === -1 && from <= 0)                  return

    // The task the group is jumping past (pivot)
    const pivotIdx = dir === 1 ? to + 1 : from - 1

    // Build segment: [group..., pivot] for down, [pivot, ...group] for up
    const segmentIndices = dir === 1
      ? [...groupIndices, pivotIdx]
      : [pivotIdx, ...groupIndices]

    // Capture current sortOrders in segment-index order (already descending since list is sorted desc)
    const sortOrders = segmentIndices.map(i =>
      visible[i].sortOrder ?? new Date(visible[i].createdAt).getTime()
    )

    // New entity order: pivot rotates to the opposite end of the group
    const segTasks = segmentIndices.map(i => visible[i])
    const newOrder = dir === 1
      ? [segTasks[segTasks.length - 1], ...segTasks.slice(0, -1)]  // pivot → front
      : [...segTasks.slice(1), segTasks[0]]                         // pivot → back

    // Re-assign the same sortOrder values to entities in their new positions
    await Promise.all(
      newOrder.map((task, i) => get().updateTask(task.id, { sortOrder: sortOrders[i] }))
    )

    // Cursor follows the moved task(s) — anchor stays, selection shifts with group
    const newFrom = from + dir
    set(s => {
      if (s.selectedTaskIds.size > 0) {
        // Keep same task IDs selected but update anchor to track movement
        return {
          selectedIndex: newFrom,
          selectionAnchor: s.selectionAnchor != null ? s.selectionAnchor + dir : null,
        }
      }
      return { selectedIndex: newFrom }
    })
  },

  moveTaskToPosition: async (sourceId, targetId) => {
    const { activeView } = get()
    if (activeView === 'upcoming' || activeView === 'done') return

    const visible = get().getVisibleTasks()
    const sourceIdx = visible.findIndex(t => t.id === sourceId)
    const targetIdx = visible.findIndex(t => t.id === targetId)
    if (sourceIdx < 0 || targetIdx < 0 || sourceIdx === targetIdx) return

    // Collect all current sortOrders sorted descending (highest = topmost)
    const sortOrders = visible
      .map(t => t.sortOrder ?? new Date(t.createdAt).getTime())
      .sort((a, b) => b - a)

    // Build new ordering: remove source, insert at target's adjusted position
    const withoutSource = visible.filter(t => t.id !== sourceId)
    const insertAt = targetIdx > sourceIdx ? targetIdx - 1 : targetIdx
    withoutSource.splice(insertAt, 0, visible[sourceIdx])

    // Re-assign sortOrder values to maintain their relative ordering
    await Promise.all(
      withoutSource.map((task, i) => get().updateTask(task.id, { sortOrder: sortOrders[i] }))
    )

    set({ selectedIndex: insertAt })
  },

  setShowCompletedInView: (v) => set({ showCompletedInView: v }),

  completeOnboarding: async (withDemoData) => {
    const { tasks, projects, splits } = await window.api.onboarding.complete(withDemoData)
    const backfilled = tasks.map(t =>
      t.sortOrder != null ? t : { ...t, sortOrder: new Date(t.createdAt).getTime() }
    )
    set({ tasks: backfilled, projects, splits, onboardingCompleted: true })
  },

  setSettingsOpen: (v) => set({ isSettingsOpen: v, settingsSection: v ? null : null }),
  setSettingsSection: (section) => set({ settingsSection: section }),

  renameLabel: async (oldName, newName) => {
    if (!newName.trim() || oldName === newName.trim()) return
    const trimmed = newName.trim()
    const affected = get().tasks.filter(t => t.labels.includes(oldName))
    await Promise.all(
      affected.map(t =>
        get().updateTask(t.id, {
          labels: t.labels.map(l => l === oldName ? trimmed : l),
        })
      )
    )
  },

  deleteLabel: async (name) => {
    const affected = get().tasks.filter(t => t.labels.includes(name))
    await Promise.all(
      affected.map(t =>
        get().updateTask(t.id, { labels: t.labels.filter(l => l !== name) })
      )
    )
  },

  deleteTask: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const taskSnapshot = { ...task }

    set(s => ({
      tasks: s.tasks.filter(t => t.id !== id),
      selectedTaskId: s.selectedTaskId === id ? null : s.selectedTaskId,
      isDetailOpen: s.selectedTaskId === id ? false : s.isDetailOpen,
    }))
    await window.api.tasks.delete(id)

    const undoId = nanoid()
    get().pushUndo({
      id: undoId,
      description: 'Delete',
      perform: async () => {
        set(s => ({ tasks: [taskSnapshot, ...s.tasks] }))
        await window.api.tasks.create(taskSnapshot)
      },
    })
    get().addToast(`"${taskSnapshot.title.slice(0, 28)}" deleted`, undoId)
  },

  deleteBulkTasks: async (ids) => {
    const idSet = new Set(ids)
    const snapshots = get().tasks.filter(t => idSet.has(t.id)).map(t => ({ ...t }))

    set(s => ({ tasks: s.tasks.filter(t => !idSet.has(t.id)), selectedTaskIds: new Set() }))
    await window.api.tasks.deleteBulk(ids)

    const undoId = nanoid()
    get().pushUndo({
      id: undoId,
      description: 'Bulk delete',
      perform: async () => {
        set(s => ({ tasks: [...snapshots, ...s.tasks] }))
        await Promise.all(snapshots.map(t => window.api.tasks.create(t)))
      },
    })
    get().addToast(`${ids.length} tasks deleted`, undoId)
  },

  toggleDone: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const prevStatus = task.status
    const prevCompletedAt = task.completedAt
    const isDone = task.status === 'done'

    // Trigger slide-away animation when marking done (not when un-marking)
    if (!isDone) set({ completingTaskId: id })

    await new Promise(resolve => setTimeout(resolve, isDone ? 0 : 280))
    set({ completingTaskId: null })

    await get().updateTask(id, {
      status: isDone ? 'inbox' : 'done',
      completedAt: isDone ? null : new Date().toISOString(),
    })

    const undoId = nanoid()
    get().pushUndo({
      id: undoId,
      description: isDone ? 'Reopen' : 'Done',
      perform: async () => {
        await get().updateTask(id, { status: prevStatus, completedAt: prevCompletedAt })
      },
    })
    // No toast — toggling done is visually self-evident (task appears/disappears)
  },

  toggleStar: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const prevStarred = task.starred
    await get().updateTask(id, { starred: !prevStarred })
    const undoId = nanoid()
    get().pushUndo({
      id: undoId,
      description: prevStarred ? 'Unstar' : 'Star',
      perform: async () => { await get().updateTask(id, { starred: prevStarred }) },
    })
    // No toast — star icon updates live on the row
  },

  cyclePriority: async (id) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const prevPriority = task.priority
    const idx = PRIORITY_CYCLE.indexOf(prevPriority)
    const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length]
    await get().updateTask(id, { priority: next })
    const undoId = nanoid()
    get().pushUndo({
      id: undoId,
      description: 'Priority',
      perform: async () => { await get().updateTask(id, { priority: prevPriority }) },
    })
    // No toast — priority dot color changes on the row
  },

  setSelectedIndex: (index) => {
    const tasks = get().getVisibleTasks()
    const clamped = Math.max(0, Math.min(index, tasks.length - 1))
    set({ selectedIndex: clamped, selectedTaskId: tasks[clamped]?.id ?? null })
  },

  moveSelection: (dir) => {
    // Plain navigation always resets shift-selection anchor
    set({ selectionAnchor: null })
    get().setSelectedIndex(get().selectedIndex + dir)
  },

  openDetail: (id) => {
    const tasks = get().getVisibleTasks()
    const idx = tasks.findIndex(t => t.id === id)
    set({ selectedTaskId: id, selectedIndex: idx >= 0 ? idx : 0, isDetailOpen: true })
  },

  closeDetail: () => set({ isDetailOpen: false }),

  setView: (view) => {
    set({ activeView: view, activeSplitId: null, selectedIndex: 0, isDetailOpen: false, selectedTaskIds: new Set(), activePicker: null, pickerTaskId: null, showCompletedInView: false })
    const tasks = get().getVisibleTasks()
    set({ selectedTaskId: tasks[0]?.id ?? null })
  },

  toggleSelectTask: (id) => {
    set(s => {
      const next = new Set(s.selectedTaskIds)
      if (next.has(id)) next.delete(id); else next.add(id)
      return { selectedTaskIds: next }
    })
  },

  clearSelection: () => set({ selectedTaskIds: new Set(), selectionAnchor: null }),

  extendSelection: (dir) => {
    const { selectedIndex, selectionAnchor } = get()
    const visible = get().getVisibleTasks()
    const anchor = selectionAnchor ?? selectedIndex
    const newIndex = Math.max(0, Math.min(visible.length - 1, selectedIndex + dir))
    if (newIndex === selectedIndex) return

    // Selection = all tasks between anchor and new cursor position (inclusive)
    const lo = Math.min(anchor, newIndex)
    const hi = Math.max(anchor, newIndex)
    const newIds = new Set(visible.slice(lo, hi + 1).map(t => t.id))
    set({ selectedIndex: newIndex, selectionAnchor: anchor, selectedTaskIds: newIds })
  },
  setCreating: (v) => set({ isCreating: v }),
  setEditingTaskId: (id) => set({ editingTaskId: id }),
  setCommandPaletteOpen: (v) => set({ isCommandPaletteOpen: v }),
  setShortcutCheatsheetOpen: (v) => set({ isShortcutCheatsheetOpen: v }),
  setProjectNavOpen: (v) => set({ isProjectNavOpen: v }),
  setSplitEditorOpen: (open, splitId = null, intent = 'split') =>
    set({ isSplitEditorOpen: open, editingSplitId: splitId ?? null, splitEditorIntent: intent }),
  setNewProjectOpen: (v) => set({ isNewProjectOpen: v }),

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('supertasks-theme', next)
    set({ theme: next })
  },
  setCommandPaletteGroupHeaders: (v) => {
    localStorage.setItem('supertasks-cmd-headers', String(v))
    set({ commandPaletteGroupHeaders: v })
  },

  setActivePicker: (type, taskId) => {
    set({ activePicker: type, pickerTaskId: taskId ?? get().selectedTaskId })
  },
  closePicker: () => set({ activePicker: null, pickerTaskId: null }),

  // ── Undo / Toast ────────────────────────────────────────────────────────────
  pushUndo: (entry) => {
    set(s => ({ undoStack: [entry, ...s.undoStack].slice(0, 20) }))
  },

  undo: async () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return
    const [top, ...rest] = undoStack
    set({ undoStack: rest })
    // Dismiss any toast that referenced this undo entry
    set(s => ({ toasts: s.toasts.filter(t => t.undoId !== top.id) }))
    await top.perform()
    get().addToast(`↩ ${top.description} undone`)
  },

  addToast: (message, undoId) => {
    const id = nanoid()
    set(s => ({ toasts: [...s.toasts, { id, message, undoId }].slice(-4) }))
  },

  dismissToast: (id) => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  },

  addRecentCommand: (id) => {
    const prev = get().recentCommandIds.filter(x => x !== id)
    const next = [id, ...prev].slice(0, 5)
    saveRecentCmds(next)
    set({ recentCommandIds: next })
  },

  getAllLabels: () => {
    const all = new Set<string>()
    get().tasks.forEach(t => t.labels.forEach(l => all.add(l)))
    return Array.from(all).sort()
  },

  toggleLabel: async (taskId, label) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return
    const hasLabel = task.labels.includes(label)
    await get().updateTask(taskId, {
      labels: hasLabel ? task.labels.filter(l => l !== label) : [...task.labels, label]
    })
  },

  getAllProjectNames: () => {
    const all = new Set<string>()
    get().tasks.forEach(t => { if (t.project) all.add(t.project) })
    return Array.from(all).sort()
  },

  renameProject: async (oldName, newName) => {
    if (!oldName || !newName || oldName === newName) return
    // 1. Re-tag every task that belongs to the old project name
    const affected = get().tasks.filter(t => t.project === oldName)
    for (const t of affected) {
      await get().updateTask(t.id, { project: newName })
    }
    // 2. Fix any split whose filter rules reference the old project name
    const splitsToFix = get().splits.filter(sp => sp.rules.projects.includes(oldName))
    for (const sp of splitsToFix) {
      await get().updateSplit(sp.id, {
        rules: {
          ...sp.rules,
          projects: sp.rules.projects.map(p => p === oldName ? newName : p),
        },
      })
    }
  },

  setTaskProject: async (taskId, projectName) => {
    await get().updateTask(taskId, { project: projectName })

    // ── Serendipitous split creation ────────────────────────────────────────
    if (projectName) {
      const alreadyHasSplit = get().splits.some(s => s.rules.projects.includes(projectName))
      if (!alreadyHasSplit) {
        await get().createSplit({
          name: projectName,
          rules: {
            projects: [projectName], labels: [], priorities: [],
            dueBefore: null, dueAfter: null, starred: null,
          },
          ruleOperator: 'AND',
          enabled: true,
        })
        get().addToast(`◈ "${projectName}" split created`)
      }
    }
  },

  navigateToProject: (projectName) => {
    set({ activeView: 'project', activeSplitId: null, selectedProject: projectName, selectedIndex: 0, isDetailOpen: false, selectedTaskIds: new Set(), activePicker: null, pickerTaskId: null, isProjectNavOpen: false })
    const tasks = get().getVisibleTasks()
    set({ selectedTaskId: tasks[0]?.id ?? null })
  },

  // ── Splits ─────────────────────────────────────────────────────────────────
  createSplit: async (draft) => {
    const maxOrder = get().splits.reduce((m, s) => Math.max(m, s.sortOrder), -1)
    const split: Split = { id: nanoid(), createdAt: new Date().toISOString(), sortOrder: maxOrder + 1, ...draft }
    set(s => ({ splits: [...s.splits, split] }))
    await window.api.splits.create(split)
    return split
  },

  updateSplit: async (id, updates) => {
    set(s => ({ splits: s.splits.map(sp => sp.id === id ? { ...sp, ...updates } : sp) }))
    const updated = get().splits.find(s => s.id === id)!
    await window.api.splits.update(updated)
  },

  deleteSplit: async (id) => {
    set(s => ({
      splits: s.splits.filter(sp => sp.id !== id),
      activeSplitId: s.activeSplitId === id ? null : s.activeSplitId,
      activeView: s.activeSplitId === id ? 'inbox' : s.activeView,
    }))
    await window.api.splits.delete(id)
  },

  setActiveSplit: (id) => {
    set({ activeView: 'split', activeSplitId: id, selectedIndex: 0, isDetailOpen: false, selectedTaskIds: new Set(), activePicker: null, pickerTaskId: null, showCompletedInView: false })
    const tasks = get().getVisibleTasks()
    set({ selectedTaskId: tasks[0]?.id ?? null })
  },

  moveSplit: async (id, dir) => {
    const enabled = [...get().splits].filter(s => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = enabled.findIndex(s => s.id === id)
    if (idx === -1) return
    const swapIdx = dir === 'left' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= enabled.length) return
    const a = enabled[idx], b = enabled[swapIdx]
    await get().updateSplit(a.id, { sortOrder: b.sortOrder })
    await get().updateSplit(b.id, { sortOrder: a.sortOrder })
  },

  getOrderedTabs: () => {
    const { splits } = get()
    const builtins: TabEntry[] = BUILTIN_VIEWS.map(v => ({ type: 'builtin', view: v }))
    const splitTabs: TabEntry[] = splits
      .filter(s => s.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(s => ({ type: 'split', id: s.id }))
    return [...builtins, ...splitTabs]
  },

  navigateToTab: (tab) => {
    if (tab.type === 'builtin') get().setView(tab.view)
    else get().setActiveSplit(tab.id)
  },

  navigateTabRelative: (dir) => {
    const s = get()
    const tabs = s.getOrderedTabs()
    const currentIdx = tabs.findIndex(t =>
      t.type === 'builtin' ? s.activeView === t.view : s.activeSplitId === t.id
    )
    const base = currentIdx === -1 ? 0 : currentIdx
    s.navigateToTab(tabs[(base + dir + tabs.length) % tabs.length])
  },

  // ── Computed ───────────────────────────────────────────────────────────────
  getVisibleTasks: () => {
    const { tasks, activeView, activeSplitId, selectedProject, splits, showCompletedInView } = get()

    switch (activeView) {
      case 'inbox':
        return tasks
          .filter(t => t.status === 'inbox' && !hasUpcomingStart(t) && !t.dueDate)
          .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))

      case 'today':
        return tasks
          .filter(t => {
            if (t.status === 'done' || hasUpcomingStart(t)) return false
            if (!t.dueDate) return false
            const d = parseISO(t.dueDate)
            return isToday(d) || isPast(d)
          })
          .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))

      case 'tomorrow': {
        const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd')
        return tasks
          .filter(t => t.status !== 'done' && t.status !== 'archived' && t.dueDate === tomorrowStr)
          .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))
      }

      case 'week': {
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const weekStr  = format(addDays(new Date(), 7), 'yyyy-MM-dd')
        return tasks
          .filter(t => t.status !== 'done' && t.status !== 'archived' && !!t.dueDate && t.dueDate >= todayStr && t.dueDate <= weekStr)
          .sort((a, b) => {
            if (a.dueDate !== b.dueDate) return (a.dueDate ?? '') < (b.dueDate ?? '') ? -1 : 1
            return (b.sortOrder ?? 0) - (a.sortOrder ?? 0)
          })
      }

      case 'upcoming':
        return tasks
          .filter(t => t.status !== 'archived' && t.status !== 'done' && hasUpcomingStart(t))
          .sort((a, b) => {
            // Soonest start date first
            const aDate = a.startDate ?? ''
            const bDate = b.startDate ?? ''
            if (aDate !== bDate) return aDate < bDate ? -1 : 1
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })

      case 'all':
        return tasks
          .filter(t => t.status !== 'archived' && !hasUpcomingStart(t))
          .sort((a, b) => {
            const pa = a.project || '\uFFFF', pb = b.project || '\uFFFF'
            if (pa !== pb) return pa.localeCompare(pb)
            return (b.sortOrder ?? 0) - (a.sortOrder ?? 0)
          })

      case 'done':
        return tasks
          .filter(t => t.status === 'done')
          .sort((a, b) => new Date(b.completedAt ?? '').getTime() - new Date(a.completedAt ?? '').getTime())

      case 'project':
        return tasks
          .filter(t =>
            t.project === selectedProject &&
            t.status !== 'archived' &&
            (showCompletedInView ? true : t.status !== 'done')
          )
          .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))

      case 'split': {
        const split = splits.find(s => s.id === activeSplitId)
        if (!split) return []
        return applySplitFilter(tasks, split)
          .filter(t => showCompletedInView ? true : t.status !== 'done')
          .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0))
      }

      default:
        return tasks
    }
  },

  getSplitTaskCount: (splitId) => {
    const split = get().splits.find(s => s.id === splitId)
    if (!split) return 0
    // Only count active (non-done, non-archived) tasks
    return applySplitFilter(get().tasks, split)
      .filter(t => t.status !== 'done' && t.status !== 'archived').length
  },
}))
