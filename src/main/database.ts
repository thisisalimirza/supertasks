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
      // Ensure arrays exist
      data.tasks = data.tasks ?? []
      data.projects = data.projects ?? []
      data.splits = data.splits ?? []
    } catch {
      data = { tasks: [], projects: [], splits: [] }
    }
  }
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
