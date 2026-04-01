import { useTaskStore } from '../store/taskStore'

const VIEW_MODES: Record<string, string> = {
  inbox: 'INBOX',
  today: 'TODAY',
  upcoming: 'UPCOMING',
  all: 'ALL',
  done: 'DONE',
  project: '◈ PROJECT',
  split: '◉ SPLIT',
}

export default function StatusBar() {
  const store = useTaskStore()
  const tasks = store.getVisibleTasks()
  const incomplete = tasks.filter(t => t.status !== 'done').length
  const activeSplit = store.activeView === 'split'
    ? store.splits.find(s => s.id === store.activeSplitId)
    : null
  const isPhotoMode = tasks.length === 0 && !store.isCreating

  // Context-aware hints
  const hints = store.selectedTaskIds.size > 0
    ? [
        `⌘D done`,
        `⌘⌫ delete`,
        `R due · H hold · L labels · M project · ! priority`,
        `⎋ deselect`,
      ]
    : store.activePicker === 'due'
      ? [`↑↓ select`, `↵ confirm`, `⎋ cancel`]
    : store.activePicker === 'label'
      ? [`↑↓ navigate`, `↵ toggle`, `⎋ cancel`]
    : store.activePicker === 'project'
      ? [`↑↓ navigate`, `↵ select`, `⎋ cancel`]
    : [
        `C new`,
        `J/K nav`,
        `↵ open`,
        `R date · L labels · M project`,
        `⌘K palette`,
      ]

  return (
    <div className={`relative z-10 flex items-center justify-between px-6 py-2 shrink-0 transition-none ${
      isPhotoMode
        ? 'bg-gradient-to-t from-black/60 via-black/25 to-transparent border-t-0'
        : 'bg-[var(--c-bg)] border-t border-[var(--c-b1)]'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-mono font-semibold tracking-widest ${
          isPhotoMode ? 'text-white/60' : 'text-[var(--c-accent)]'
        }`}>
          {activeSplit
            ? `◉ ${activeSplit.name.toUpperCase()}`
            : store.activeView === 'project' && store.selectedProject
              ? `◈ ${store.selectedProject.toUpperCase()}`
              : VIEW_MODES[store.activeView] ?? store.activeView.toUpperCase()}
        </span>
        <span className={`text-[10px] font-mono ${isPhotoMode ? 'text-white/35' : 'text-[var(--c-t8)]'}`}>
          {incomplete} remaining
        </span>
        {store.selectedTaskIds.size > 0 && (
          <span className={`text-[10px] font-mono ${isPhotoMode ? 'text-white/60' : 'text-[var(--c-accent)]'}`}>
            {store.selectedTaskIds.size} selected
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {hints.map((hint, i) => (
          <span key={i} className={`text-[10px] font-mono ${isPhotoMode ? 'text-white/35' : 'text-[var(--c-t8)]'}`}>{hint}</span>
        ))}
      </div>
    </div>
  )
}
