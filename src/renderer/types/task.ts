export type { Task, Project, Split, SplitRules, TaskStatus, TaskPriority, TaskView } from '../../shared/types'

// Window API type augmentation
import type { Task, Project, Split } from '../../shared/types'

declare global {
  interface Window {
    api: {
      tasks: {
        getAll: () => Promise<Task[]>
        create: (task: Task) => Promise<Task>
        update: (task: Task) => Promise<Task>
        delete: (id: string) => Promise<string>
        deleteBulk: (ids: string[]) => Promise<string[]>
      }
      projects: {
        getAll: () => Promise<Project[]>
        create: (project: Project) => Promise<Project>
      }
      splits: {
        getAll: () => Promise<Split[]>
        create: (split: Split) => Promise<Split>
        update: (split: Split) => Promise<Split>
        delete: (id: string) => Promise<string>
      }
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
        getVersion: () => Promise<string>
      }
      onTasksChanged: (fn: (view?: string) => void) => () => void
      onEscape: (fn: () => void) => () => void
      onMenuShortcuts: (fn: () => void) => () => void
      onboarding: {
        getStatus: () => Promise<boolean>
        complete: (withDemoData: boolean) => Promise<{ tasks: Task[]; projects: Project[]; splits: Split[] }>
      }
      quickAdd: {
        signalReady: () => Promise<void>
        submit: (task: Task | null) => Promise<void>
        dismiss: () => Promise<void>
        resize: (height: number) => Promise<void>
        onFocus: (fn: () => void) => () => void
      }
    }
  }
}
