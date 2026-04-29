import { useEffect } from 'react'
import { useTaskStore } from './store/taskStore'
import { useKeyboard } from './hooks/useKeyboard'
import TaskList from './components/TaskList'
import TaskDetail from './components/TaskDetail'
import CommandPalette from './components/CommandPalette'
import ShortcutCheatsheet from './components/ShortcutCheatsheet'
import ProjectNavOverlay from './components/ProjectNavOverlay'
import SplitEditorPopover from './components/SplitEditorPopover'
import ToastStack from './components/Toast'
import StatusBar from './components/StatusBar'
import TitleBar from './components/TitleBar'
import SettingsPanel from './components/SettingsPanel'
import NewProjectDialog from './components/NewProjectDialog'
import OnboardingFlow from './components/OnboardingFlow'

export default function App() {
  const loadTasks = useTaskStore(s => s.loadTasks)
  const setActiveView = useTaskStore(s => s.setView)
  const onboardingCompleted = useTaskStore(s => s.onboardingCompleted)
  const isDetailOpen = useTaskStore(s => s.isDetailOpen)
  const isCommandPaletteOpen = useTaskStore(s => s.isCommandPaletteOpen)
  const isShortcutCheatsheetOpen = useTaskStore(s => s.isShortcutCheatsheetOpen)
  const isProjectNavOpen = useTaskStore(s => s.isProjectNavOpen)
  const isSplitEditorOpen = useTaskStore(s => s.isSplitEditorOpen)
  const isNewProjectOpen = useTaskStore(s => s.isNewProjectOpen)
  const isSettingsOpen = useTaskStore(s => s.isSettingsOpen)
  const theme = useTaskStore(s => s.theme)
  const isPhotoMode = useTaskStore(s => s.getVisibleTasks().length === 0 && !s.isCreating)
  const shortcuts = useKeyboard()

  // Apply data-theme to root so CSS custom properties switch
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Bootstrap on first render (localStorage might have persisted theme already)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    loadTasks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh store when quick-add creates a task, then jump to the view it landed in
  // (inbox = no due date, today = has due date) so it's immediately visible.
  useEffect(() => {
    return window.api?.onTasksChanged?.((view?: string) => {
      loadTasks().then(() => {
        if (view) setActiveView(view as Parameters<typeof setActiveView>[0])
      })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Native Help menu → open shortcut cheatsheet
  useEffect(() => {
    return window.api?.onMenuShortcuts?.(() => {
      useTaskStore.getState().setShortcutCheatsheetOpen(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isPhotoMode ? 'bg-transparent' : 'bg-[var(--c-bg)]'}`}>
      <TitleBar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Settings panel — slides in from left */}
        <SettingsPanel />

        {/* Main task list */}
        <div
          className="flex-1 overflow-hidden"
          style={{
            marginLeft: isSettingsOpen ? 'min(300px, 60%)' : '0',
            marginRight: isDetailOpen ? 'min(420px, 60%)' : '0',
          }}
        >
          <TaskList />
        </div>

        {/* Detail pane — slides in from right */}
        <TaskDetail />
      </div>

      <StatusBar />

      {/* Overlays */}
      {isCommandPaletteOpen && <CommandPalette shortcuts={shortcuts} />}
      {isShortcutCheatsheetOpen && <ShortcutCheatsheet shortcuts={shortcuts} />}
      {isProjectNavOpen && <ProjectNavOverlay />}
      {isSplitEditorOpen && <SplitEditorPopover />}
      {isNewProjectOpen && <NewProjectDialog />}
      <ToastStack />

      {/* First-launch onboarding — shown until user completes it */}
      {!onboardingCompleted && <OnboardingFlow />}
    </div>
  )
}
