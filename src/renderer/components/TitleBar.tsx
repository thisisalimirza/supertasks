import { useTaskStore } from '../store/taskStore'

function SunIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export default function TitleBar() {
  const theme = useTaskStore(s => s.theme)
  const toggleTheme = useTaskStore(s => s.toggleTheme)
  const isPhotoMode = useTaskStore(s => s.getVisibleTasks().length === 0 && !s.isCreating)

  return (
    <div className={`drag-region relative z-10 flex items-center justify-between h-11 px-4 shrink-0 transition-none ${
      isPhotoMode
        ? 'bg-transparent border-b-0'
        : 'bg-[var(--c-bg)] border-b border-[var(--c-b2)]'
    }`}>
      {/* Traffic light space (macOS handles native controls at x:16 y:16) */}
      <div className="w-16" />

      {/* No center label — view name lives in the TaskList header below */}
      <div className="flex-1" />

      <div className="w-16 flex items-center justify-end gap-2 no-drag">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`transition-colors p-1 rounded ${
            isPhotoMode
              ? 'text-white/50 hover:text-white/90 hover:bg-white/10'
              : 'text-[var(--c-t5)] hover:text-[var(--c-t1)] hover:bg-[var(--c-btn)]'
          }`}
          title={theme === 'dark' ? 'Switch to light mode (⌘⇧L)' : 'Switch to dark mode (⌘⇧L)'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  )
}
