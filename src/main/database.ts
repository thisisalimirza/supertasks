import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { Task, Project, Split } from '../shared/types'

interface AppData {
  tasks: Task[]
  projects: Project[]
  splits: Split[]
  windowState?: { x?: number; y?: number; width: number; height: number }
}

let dataPath: string
let data: AppData = { tasks: [], projects: [], splits: [] }

export function initDatabase() {
  dataPath = path.join(app.getPath('userData'), 'supertasks.json')

  if (fs.existsSync(dataPath)) {
    try {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      data.tasks = data.tasks ?? []
      data.projects = data.projects ?? []
      data.splits = data.splits ?? []
    } catch {
      data = { tasks: [], projects: [], splits: [] }
    }
  } else {
    // First launch on this machine — seed demo data so the app isn't empty
    seedDemoData()
    persist()
  }
}

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function seedDemoData() {
  const now = new Date().toISOString()

  data.projects = [
    { id: 'proj-work',     name: 'Work',     createdAt: now },
    { id: 'proj-personal', name: 'Personal', createdAt: now },
  ]

  data.splits = [
    {
      id: 'split-work',
      name: 'Work',
      rules: { projects: ['Work'], labels: [], priorities: [], dueBefore: null, dueAfter: null, starred: null },
      ruleOperator: 'AND',
      enabled: true,
      sortOrder: 0,
      createdAt: now,
    },
  ]

  data.tasks = [
    // ── Inbox ────────────────────────────────────────────────────────────────
    {
      id: 'demo-1', title: 'Review Q1 goals and update OKRs',
      notes: '', status: 'inbox', priority: 'high',
      dueDate: daysFromNow(1), startDate: null, reminder: null,
      project: '', labels: [], createdAt: now, completedAt: null,
      starred: true, sortOrder: 100,
    },
    {
      id: 'demo-2', title: 'Submit expense report for last month',
      notes: '', status: 'inbox', priority: 'medium',
      dueDate: daysFromNow(3), startDate: null, reminder: null,
      project: '', labels: [], createdAt: now, completedAt: null,
      starred: false, sortOrder: 90,
    },
    {
      id: 'demo-3', title: 'Book dentist appointment',
      notes: '', status: 'inbox', priority: 'none',
      dueDate: null, startDate: null, reminder: null,
      project: '', labels: [], createdAt: now, completedAt: null,
      starred: false, sortOrder: 80,
    },
    // ── Work ─────────────────────────────────────────────────────────────────
    {
      id: 'demo-4', title: 'Ship v2 release to production',
      notes: 'Coordinate with design and QA before deploying.',
      status: 'inbox', priority: 'urgent',
      dueDate: daysFromNow(2), startDate: null, reminder: null,
      project: 'Work', labels: [], createdAt: now, completedAt: null,
      starred: true, sortOrder: 100,
    },
    {
      id: 'demo-5', title: 'Review open pull requests',
      notes: '', status: 'inbox', priority: 'high',
      dueDate: daysFromNow(0), startDate: null, reminder: null,
      project: 'Work', labels: [], createdAt: now, completedAt: null,
      starred: false, sortOrder: 90,
    },
    {
      id: 'demo-6', title: 'Write project retrospective doc',
      notes: '', status: 'inbox', priority: 'medium',
      dueDate: daysFromNow(5), startDate: null, reminder: null,
      project: 'Work', labels: [], createdAt: now, completedAt: null,
      starred: false, sortOrder: 80,
    },
    {
      id: 'demo-7', title: 'Update product roadmap for next quarter',
      notes: '', status: 'inbox', priority: 'low',
      dueDate: null, startDate: null, reminder: null,
      project: 'Work', labels: [], createdAt: now, completedAt: null,
      starred: false, sortOrder: 70,
    },
    // ── Personal ─────────────────────────────────────────────────────────────
    {
      id: 'demo-8', title: 'Read Atomic Habits',
      notes: '', status: 'inbox', priority: 'none',
      dueDate: null, startDate: null, reminder: null,
      project: 'Personal', labels: [], createdAt: now, completedAt: null,
      starred: true, sortOrder: 100,
    },
    {
      id: 'demo-9', title: 'Plan weekend trip',
      notes: '', status: 'inbox', priority: 'low',
      dueDate: daysFromNow(7), startDate: null, reminder: null,
      project: 'Personal', labels: [], createdAt: now, completedAt: null,
      starred: false, sortOrder: 90,
    },
    // ── Done (so the Done view isn't empty on first open) ────────────────────
    {
      id: 'demo-10', title: 'Set up SuperTasks',
      notes: '', status: 'done', priority: 'none',
      dueDate: null, startDate: null, reminder: null,
      project: '', labels: [], createdAt: now, completedAt: now,
      starred: false, sortOrder: 0,
    },
  ] as Task[]
}

function persist() {
  if (!dataPath) return
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
}

export const db = {
  getTasks: (): Task[] => data.tasks,

  createTask: (task: Task): Task => {
    data.tasks.unshift(task)
    persist()
    return task
  },

  updateTask: (updated: Task): Task => {
    const idx = data.tasks.findIndex(t => t.id === updated.id)
    if (idx >= 0) data.tasks[idx] = updated
    persist()
    return updated
  },

  deleteTask: (id: string): string => {
    data.tasks = data.tasks.filter(t => t.id !== id)
    persist()
    return id
  },

  deleteBulkTasks: (ids: string[]): string[] => {
    const idSet = new Set(ids)
    data.tasks = data.tasks.filter(t => !idSet.has(t.id))
    persist()
    return ids
  },

  getProjects: (): Project[] => data.projects,

  createProject: (project: Project): Project => {
    if (!data.projects.find(p => p.id === project.id)) {
      data.projects.push(project)
      persist()
    }
    return project
  },

  getSplits: (): Split[] => data.splits,

  createSplit: (split: Split): Split => {
    data.splits.push(split)
    persist()
    return split
  },

  updateSplit: (updated: Split): Split => {
    const idx = data.splits.findIndex(s => s.id === updated.id)
    if (idx >= 0) data.splits[idx] = updated
    persist()
    return updated
  },

  deleteSplit: (id: string): string => {
    data.splits = data.splits.filter(s => s.id !== id)
    persist()
    return id
  },

  getWindowState: () => data.windowState,

  setWindowState: (state: AppData['windowState']) => {
    data.windowState = state
    persist()
  },
}
