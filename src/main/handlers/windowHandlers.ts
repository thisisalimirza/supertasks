import { ipcMain, BrowserWindow, app } from 'electron'

export function registerWindowHandlers(win: BrowserWindow) {
  ipcMain.handle('window:minimize', () => win.minimize())
  ipcMain.handle('window:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window:close', () => win.close())
  ipcMain.handle('app:getVersion', () => app.getVersion())
}
