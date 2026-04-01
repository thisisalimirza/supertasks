import { ipcMain, BrowserWindow } from 'electron'
import { db } from '../database'
import type { Task, Project, Split } from '../../shared/types'

export function registerTaskHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('tasks:getAll', () => db.getTasks())
  ipcMain.handle('tasks:create', (_, task: Task) => {
    const result = db.createTask(task)
    getMainWindow()?.webContents.send('tasks:changed')
    return result
  })
  ipcMain.handle('tasks:update', (_, task: Task) => db.updateTask(task))
  ipcMain.handle('tasks:delete', (_, id: string) => db.deleteTask(id))
  ipcMain.handle('tasks:deleteBulk', (_, ids: string[]) => db.deleteBulkTasks(ids))
  ipcMain.handle('projects:getAll', () => db.getProjects())
  ipcMain.handle('projects:create', (_, project: Project) => db.createProject(project))
  ipcMain.handle('splits:getAll', () => db.getSplits())
  ipcMain.handle('splits:create', (_, split: Split) => db.createSplit(split))
  ipcMain.handle('splits:update', (_, split: Split) => db.updateSplit(split))
  ipcMain.handle('splits:delete', (_, id: string) => db.deleteSplit(id))
}
