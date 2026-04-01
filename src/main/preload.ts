import { contextBridge, ipcRenderer } from 'electron'
import type { Task, Project, Split } from '../shared/types'

// Callback store for global-escape (contextIsolation-safe pattern)
let escapeListeners: Array<() => void> = []

ipcRenderer.on('global-escape', () => {
  escapeListeners.forEach(fn => fn())
})

// Typed IPC bridge — renderer gets this as window.api
const api = {
  tasks: {
    getAll: (): Promise<Task[]> => ipcRenderer.invoke('tasks:getAll'),
    create: (task: Task): Promise<Task> => ipcRenderer.invoke('tasks:create', task),
    update: (task: Task): Promise<Task> => ipcRenderer.invoke('tasks:update', task),
    delete: (id: string): Promise<string> => ipcRenderer.invoke('tasks:delete', id),
    deleteBulk: (ids: string[]): Promise<string[]> => ipcRenderer.invoke('tasks:deleteBulk', ids),
  },
  projects: {
    getAll: (): Promise<Project[]> => ipcRenderer.invoke('projects:getAll'),
    create: (project: Project) => ipcRenderer.invoke('projects:create', project),
  },
  splits: {
    getAll: (): Promise<Split[]> => ipcRenderer.invoke('splits:getAll'),
    create: (split: Split): Promise<Split> => ipcRenderer.invoke('splits:create', split),
    update: (split: Split): Promise<Split> => ipcRenderer.invoke('splits:update', split),
    delete: (id: string): Promise<string> => ipcRenderer.invoke('splits:delete', id),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  // Notified when a task is created from another window (e.g. quick-add).
  // The optional `view` arg tells the main window which view to navigate to.
  onTasksChanged: (fn: (view?: string) => void) => {
    const handler = (_: unknown, view?: string) => fn(view)
    ipcRenderer.on('tasks:changed', handler)
    return () => ipcRenderer.removeListener('tasks:changed', handler)
  },

  // Global escape handler — bypasses contextIsolation boundary
  onEscape: (fn: () => void) => {
    escapeListeners.push(fn)
    return () => { escapeListeners = escapeListeners.filter(f => f !== fn) }
  },

  // Native menu → renderer bridge
  onMenuShortcuts: (fn: () => void) => {
    const handler = () => fn()
    ipcRenderer.on('menu:shortcuts', handler)
    return () => ipcRenderer.removeListener('menu:shortcuts', handler)
  },

  // Quick-add window API
  quickAdd: {
    signalReady: () => ipcRenderer.invoke('quickadd:ready'),
    // submit: create task (if any) + restore focus + hide — all in one IPC so
    // restoreFrontmostApp() is guaranteed to run after the task is persisted,
    // not racing against a separate tasks:create call.
    submit: (task: Task | null) => ipcRenderer.invoke('quickadd:submit', task),
    dismiss: () => ipcRenderer.invoke('quickadd:dismiss'),
    resize: (height: number) => ipcRenderer.invoke('quickadd:resize', height),
    onFocus: (fn: () => void) => {
      const handler = () => fn()
      ipcRenderer.on('quickadd:focus', handler)
      return () => ipcRenderer.removeListener('quickadd:focus', handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
