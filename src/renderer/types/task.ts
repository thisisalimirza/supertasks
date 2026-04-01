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
      }
      onEscape: (fn: () => void) => () => void
      quickAdd: {
        dismiss: () => Promise<void>
        onFocus: (fn: () => void) => () => void
      }
    }
  }
}
