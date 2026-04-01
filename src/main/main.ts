import { app, BrowserWindow, shell, globalShortcut, ipcMain, session, protocol } from 'electron'
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
    // Must be synchronous — async capture races with show()/focus() and ends
    // up recording "SuperTasks" as the frontmost app instead of the real one.
    previousActiveApp = execFileSync('osascript', ['-e', 'name of (path to frontmost application)'])
      .toString().trim()
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
    execFileSync('osascript', ['-e', `tell application "${appName}" to activate`])
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
    minWidth: 800,
    minHeight: 600,
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

  // Set ready flag after first paint — React is guaranteed to be mounted at this point
  quickAddWindow.once('ready-to-show', () => { quickAddReady = true })

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
  }
  if (quickAddReady) {
    doShow()
  } else {
    quickAddWindow!.once('ready-to-show', () => { quickAddReady = true; doShow() })
  }
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
          "default-src 'self' 'unsafe-inline' data: blob:; img-src 'self' data: blob: https: http:; connect-src 'self' ws: wss: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval';"
        ],
      },
    })
  })

  initDatabase()
  createWindow()
  createQuickAddWindow()
  registerTaskHandlers(() => mainWindow)
  if (mainWindow) registerWindowHandlers(mainWindow)

  // ── Global shortcut: Option+Space ────────────────────────────────────────
  globalShortcut.register('Alt+Space', showQuickAdd)

  // ── IPC: renderer asks to dismiss the quick-add window ───────────────────
  ipcMain.handle('quickadd:dismiss', () => {
    restoreFrontmostApp()   // activate previous app first, then hide
    quickAddWindow?.hide()
  })
  // ── IPC: renderer drives window height to match card content ─────────────
  ipcMain.handle('quickadd:resize', (_, height: number) => {
    quickAddWindow?.setSize(620, Math.round(height))
  })

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
