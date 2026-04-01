export type TaskStatus = 'inbox' | 'done' | 'archived'
export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'
export type TaskView = 'inbox' | 'today' | 'tomorrow' | 'week' | 'all' | 'done' | 'project' | 'split' | 'upcoming'

export interface SplitRules {
  projects: string[]
  labels: string[]
  priorities: TaskPriority[]
  dueBefore: string | null   // ISO date string
  dueAfter: string | null
  starred: boolean | null    // null = ignore
}

export interface Split {
  id: string
  name: string
  rules: SplitRules
  ruleOperator: 'AND' | 'OR'
  enabled: boolean
  sortOrder: number
  createdAt: string
}

export interface Task {
  id: string
  title: string
  notes: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  startDate: string | null   // hide task until this date
  reminder: string | null
  project: string
  labels: string[]
  createdAt: string
  completedAt: string | null
  starred: boolean
  sortOrder: number
}

export interface Project {
  id: string
  name: string
  color?: string
  createdAt: string
}
