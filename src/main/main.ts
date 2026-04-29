import { app, BrowserWindow, shell, globalShortcut, ipcMain, session, protocol, Menu } from 'electron'
import fs from 'fs'
import path from 'path'
import { execFile, execFileSync } from 'child_process'
import { initDatabase, db } from './database'
import { registerTaskHandlers } from './handlers/taskHandlers'
import { registerWindowHandlers } from './handlers/windowHandlers'

let mainWindow: BrowserWindow | null = null
let quickAddWindow: BrowserWindow | null = null
let quickAddReady = false
let previousActiveApp: string | null = null

function captureFrontmostApp() {
  if (process.platform !== 'darwin') return
  try {
    // System Events process query works for every app regardless of bundle path,
    // unlike `name of (path to frontmost application)` which fails for sandboxed
    // or non-standard apps (e.g. Claude, some Electron apps).
    previousActiveApp = execFileSync('osascript', [
      '-e', 'tell application "System Events" to get name of first application process whose frontmost is true',
    ]).toString().trim()
  } catch { /* ignore */ }
}

function restoreFrontmostApp() {
  if (process.platform !== 'darwin' || !previousActiveApp) return
  const appName = previousActiveApp
  previousActiveApp = null
  try {
    // Must be synchronous AND called before hide() — macOS assigns focus to the
    // next app-window the instant a window is hidden (window server level, before
    // any JS runs). Activating the target app first means macOS has nowhere to
    // reassign focus when quick-add disappears.
    // Use System Events process activation — works even when `tell application`
    // fails (e.g. apps whose bundle name differs from their process name).
    execFileSync('osascript', [
      '-e', `tell application "System Events" to set frontmost of application process "${appName}" to true`,
    ])
  } catch { /* ignore */ }
}

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

// Register a privileged custom scheme for the renderer in production.
// file:// + asar has a broken origin model (each file is its own unique origin)
// which makes CSP `'self'` block assets. A named scheme gets a real stable
// origin (app://app) that behaves like HTTP, so `'self'` works correctly and
// Electron's patched `net` module still reads files from inside the asar.
if (!VITE_DEV_SERVER_URL) {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } },
  ])
}

function createWindow() {
  const savedState = db.getWindowState()

  mainWindow = new BrowserWindow({
    width: savedState?.width ?? 1200,
    height: savedState?.height ?? 800,
    x: savedState?.x,
    y: savedState?.y,
    minWidth: 380,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0A0A0A',
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadURL('app://app/index.html')
  }

  // Intercept Escape at the browser process level and forward to renderer
  // This handles cases where macOS/Electron consumes the key before JS sees it
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape' && !input.meta && !input.control) {
      event.preventDefault()
      mainWindow!.webContents.send('global-escape')
    }
  })

  mainWindow.on('close', () => {
    if (!mainWindow) return
    const { x, y, width, height } = mainWindow.getBounds()
    db.setWindowState({ x, y, width, height })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function createQuickAddWindow() {
  quickAddWindow = new BrowserWindow({
    width: 620,
    height: 175,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    // macOS vibrancy — glass-like floating panel
    ...(process.platform === 'darwin' ? {
      vibrancy: 'hud' as const,
      visualEffectState: 'active' as const,
    } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Appear on whatever Space the user is on — never pull them back to the main window's Space
  quickAddWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // setVisibleOnAllWorkspaces can flip the app to "accessory" activation policy on macOS,
  // which removes the dock icon. Restore it explicitly.
  if (process.platform === 'darwin') {
    app.dock?.show()
    app.dock?.setIcon(path.join(__dirname, '../../assets/icon.png'))
  }

  // Reset ready whenever the renderer reloads (GPU crash recovery, HMR full reload, etc.)
  // quickAddReady is set back to true by the 'quickadd:ready' IPC sent from React on mount.
  quickAddWindow.webContents.on('did-start-loading', () => { quickAddReady = false })

  if (VITE_DEV_SERVER_URL) {
    quickAddWindow.loadURL(`${VITE_DEV_SERVER_URL}#quickadd`)
  } else {
    quickAddWindow.loadURL('app://app/index.html#quickadd')
  }

  // Hide on blur — debounce prevents a race where show()→focus() briefly blurs the window.
  // Do NOT restore focus here: if the user clicked another app they've already chosen it.
  quickAddWindow.on('blur', () => {
    setTimeout(() => {
      if (quickAddWindow && !quickAddWindow.isFocused()) {
        quickAddWindow.hide()
      }
    }, 150)
  })

  // Prevent close; hide instead so it's instant next time
  quickAddWindow.on('close', e => { e.preventDefault(); quickAddWindow?.hide() })
}

function showQuickAdd() {
  if (!quickAddWindow) createQuickAddWindow()
  if (quickAddWindow!.isVisible()) {
    restoreFrontmostApp()   // activate previous app first, then hide
    quickAddWindow!.hide()
    return
  }
  const doShow = () => {
    captureFrontmostApp() // remember what was active before we steal focus
    quickAddWindow!.center()
    quickAddWindow!.show()
    quickAddWindow!.focus()
    // Explicitly tell the renderer to reset + focus the input.
    // More reliable than the native window 'focus' event, which can fire
    // before the listener is registered (first show) or be swallowed by
    // macOS when focus is transferred between spaces/apps.
    try { quickAddWindow!.webContents.send('quickadd:focus') } catch { /* renderer not ready */ }
  }
  if (quickAddReady) {
    doShow()
  } else {
    quickAddWindow!.once('ready-to-show', () => { quickAddReady = true; doShow() })
  }
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu (first menu = app name in menu bar)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        {
          label: `About ${app.name}`,
          click: () => app.showAboutPanel(),
        },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    // Edit menu — enables system cut/copy/paste/undo in all text inputs
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
        ] : [
          { role: 'close' as const },
        ]),
      ],
    },
    // Help menu
    {
      role: 'help' as const,
      submenu: [
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+/',
          click: () => mainWindow?.webContents.send('menu:shortcuts'),
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function configureAboutPanel() {
  app.setAboutPanelOptions({
    applicationName: 'Supertasks',
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: 'Copyright © 2026 Ali Mirza',
    iconPath: path.join(__dirname, '../../assets/icon.png'),
  })
}

app.whenReady().then(() => {
  // ── Custom app:// protocol — serves renderer files from inside the asar ───
  // net.fetch with file:// is asar-aware in Electron 25+, giving us a real
  // HTTP-like origin (app://app) so CSP `'self'` works correctly.
  if (!VITE_DEV_SERVER_URL) {
    protocol.handle('app', (request) => {
      const { pathname } = new URL(request.url)
      const filePath = path.join(__dirname, '..', 'renderer', pathname)
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
      }
      try {
        const data = fs.readFileSync(filePath)
        const ext = path.extname(filePath).toLowerCase()
        return new Response(data, {
          headers: { 'content-type': mimeTypes[ext] ?? 'application/octet-stream' },
        })
      } catch {
        return new Response('Not found', { status: 404 })
      }
    })
  }

  // ── Allow external image sources (e.g. picsum.photos for InboxZeroScreen) ─
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob: https: http:; connect-src 'self' ws: wss: https:; script-src 'self' 'unsafe-inline';"
        ],
      },
    })
  })

  buildAppMenu()
  configureAboutPanel()

  initDatabase()
  createWindow()
  createQuickAddWindow()
  registerTaskHandlers(() => mainWindow)
  if (mainWindow) registerWindowHandlers(mainWindow)

  // ── Global shortcut: Option+Space ────────────────────────────────────────
  globalShortcut.register('Alt+Space', showQuickAdd)

  // ── IPC: renderer signals it has mounted and is ready to receive events ──
  ipcMain.handle('quickadd:ready', () => { quickAddReady = true })

  // ── IPC: submit task (optional) + restore focus + hide ───────────────────
  // Combining create + dismiss in one handler guarantees restoreFrontmostApp()
  // runs after the task is written, not racing a separate tasks:create call.
  ipcMain.handle('quickadd:submit', (_, task) => {
    if (task) {
      db.createTask(task)
      const view = task.dueDate ? 'today' : 'inbox'
      mainWindow?.webContents.send('tasks:changed', view)
    }
    restoreFrontmostApp()   // activate previous app first, then hide
    quickAddWindow?.hide()
  })
  // ── IPC: renderer asks to dismiss the quick-add window ───────────────────
  ipcMain.handle('quickadd:dismiss', () => {
    restoreFrontmostApp()   // activate previous app first, then hide
    quickAddWindow?.hide()
  })
  // ── IPC: renderer drives window height to match card content ─────────────
  ipcMain.handle('quickadd:resize', (_, height: number) => {
    quickAddWindow?.setSize(620, Math.round(height))
  })

  // ── Auto-updater (production only) ───────────────────────────────────────
  // Only run in packaged builds; dev mode has no update server to talk to.
  if (app.isPackaged) {
    import('electron-updater').then(({ autoUpdater }) => {
      autoUpdater.checkForUpdatesAndNotify()
    }).catch(() => { /* ignore — update server may not be configured yet */ })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().filter(w => w !== quickAddWindow).length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})
