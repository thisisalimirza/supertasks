import { useState, useRef, useEffect, useCallback } from 'react'

import { useTaskStore } from '../store/taskStore'

export const SPLIT_VIEW_SOFT_LIMIT = 5

type Section = 'appearance' | 'labels' | 'views' | 'data'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'labels',     label: 'Labels' },
  { id: 'views',      label: 'Views & Projects' },
  { id: 'data',       label: 'Data' },
]

// ── Root menu ─────────────────────────────────────────────────────────────────
function RootMenu({
  onEnter,
  focusedIndex,
  setFocusedIndex,
}: {
  onEnter: (s: Section) => void
  focusedIndex: number
  setFocusedIndex: (i: number) => void
}) {
  const store = useTaskStore()
  const labelCount = store.getAllLabels().length
  const doneCount = store.tasks.filter(t => t.status === 'done').length

  const viewCount = store.splits.filter(s => s.enabled).length
  const metas: Record<Section, string | undefined> = {
    appearance: store.theme,
    labels:     labelCount > 0 ? String(labelCount) : undefined,
    views:      viewCount > 0  ? String(viewCount)  : undefined,
    data:       doneCount > 0  ? `${doneCount} done` : undefined,
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {SECTIONS.map((row, i) => (
        <button
          key={row.id}
          onClick={() => onEnter(row.id)}
          onMouseEnter={() => setFocusedIndex(i)}
          className={`no-drag w-full flex items-center justify-between px-6 py-3 text-left transition-colors group ${
            i === focusedIndex ? 'bg-[var(--c-sel)]' : 'hover:bg-[var(--c-hover)]'
          }`}
        >
          <span className={`text-sm transition-colors ${i === focusedIndex ? 'text-[var(--c-t1)]' : 'text-[var(--c-t2)]'}`}>
            {row.label}
          </span>
          <div className="flex items-center gap-2.5">
            {metas[row.id] && (
              <span className="text-xs text-[var(--c-t6)] font-mono capitalize">{metas[row.id]}</span>
            )}
            <svg
              className={`w-3 h-3 transition-colors ${i === focusedIndex ? 'text-[var(--c-t5)]' : 'text-[var(--c-t7)]'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Appearance section ────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`no-drag relative w-8 h-4.5 rounded-full transition-colors shrink-0 ${on ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-b3)]'}`}
      style={{ height: '18px', width: '32px' }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white transition-all"
        style={{ width: 14, height: 14, left: on ? 16 : 2 }}
      />
    </button>
  )
}

function SettingRow({ label, description, on, onToggle }: { label: string; description?: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="px-6 py-3 flex items-center justify-between border-b border-[var(--c-b0)]">
      <div>
        <p className="text-sm text-[var(--c-t2)]">{label}</p>
        {description && <p className="text-xs text-[var(--c-t6)] font-mono mt-0.5">{description}</p>}
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  )
}

function AppearanceSection() {
  const store = useTaskStore()
  const isDark = store.theme === 'dark'
  return (
    <div className="flex-1 overflow-y-auto py-1">
      <div className="px-6 py-3 flex items-center justify-between border-b border-[var(--c-b0)]">
        <div>
          <p className="text-sm text-[var(--c-t2)]">Theme</p>
          <p className="text-xs text-[var(--c-t6)] font-mono mt-0.5 capitalize">{store.theme} mode</p>
        </div>
        <button
          onClick={() => store.toggleTheme()}
          className="no-drag flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--c-btn)] hover:bg-[var(--c-btn-h)] transition-colors text-xs text-[var(--c-t3)]"
        >
          <span className="text-[var(--c-t5)]">{isDark ? '○' : '●'}</span>
          {isDark ? 'Light mode' : 'Dark mode'}
        </button>
      </div>
      <SettingRow
        label="Command palette headers"
        description="Show group labels in search results"
        on={store.commandPaletteGroupHeaders}
        onToggle={() => store.setCommandPaletteGroupHeaders(!store.commandPaletteGroupHeaders)}
      />
    </div>
  )
}

// ── Labels section ────────────────────────────────────────────────────────────
function LabelsSection() {
  const store = useTaskStore()
  const allLabels = store.getAllLabels()
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingLabel !== null) {
      setTimeout(() => editInputRef.current?.select(), 0)
    }
  }, [editingLabel])

  const startEdit = (label: string) => { setEditingLabel(label); setEditValue(label) }

  const commitEdit = async () => {
    if (editingLabel !== null && editValue.trim() && editValue.trim() !== editingLabel) {
      await store.renameLabel(editingLabel, editValue.trim())
    }
    setEditingLabel(null)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {allLabels.length === 0 ? (
        <p className="px-6 py-5 text-sm text-[var(--c-t6)]">
          No labels yet. Press{' '}
          <span className="font-mono bg-[var(--c-btn)] px-1.5 py-0.5 rounded text-xs">L</span>
          {' '}on any task to add one.
        </p>
      ) : (
        <div className="py-1">
          {allLabels.map(label => (
            <div
              key={label}
              className="group flex items-center gap-3 px-6 py-2.5 border-b border-[var(--c-b0)] hover:bg-[var(--c-hover)] transition-colors"
            >
              {editingLabel === label ? (
                <input
                  ref={editInputRef}
                  className="no-drag flex-1 bg-transparent text-sm text-[var(--c-t1)] outline-none border-b border-[var(--c-accent)] pb-0.5"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                    if (e.key === 'Escape') { e.preventDefault(); setEditingLabel(null) }
                  }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-sm text-[var(--c-t2)] truncate">{label}</span>
              )}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => startEdit(label)}
                  className="no-drag px-2 py-1 rounded text-[10px] text-[var(--c-t5)] hover:text-[var(--c-t2)] hover:bg-[var(--c-btn)] transition-colors font-mono"
                >
                  rename
                </button>
                <button
                  onClick={() => store.deleteLabel(label)}
                  className="no-drag px-2 py-1 rounded text-[10px] text-[var(--c-danger)] hover:bg-[var(--c-btn)] transition-colors opacity-60 hover:opacity-100 font-mono"
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Views section ─────────────────────────────────────────────────────────────
function ViewsSection() {
  const store = useTaskStore()
  const splits = store.splits.filter(s => s.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
  const overLimit = splits.length > SPLIT_VIEW_SOFT_LIMIT

  return (
    <div className="flex-1 overflow-y-auto">
      {splits.length === 0 ? (
        <p className="px-6 py-5 text-sm text-[var(--c-t6)]">
          No views yet. Create a project or filter from the command palette.
        </p>
      ) : (
        <div className="py-1">
          {splits.map((split, i) => (
            <div
              key={split.id}
              className="flex items-center gap-2 px-6 py-2.5 border-b border-[var(--c-b0)] hover:bg-[var(--c-hover)] transition-colors group"
            >
              {/* Order badge */}
              <span className="text-[10px] font-mono text-[var(--c-t7)] w-4 shrink-0">{i + 1}</span>
              <span className="flex-1 text-sm text-[var(--c-t2)] truncate">{split.name}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  disabled={i === 0}
                  onClick={() => store.moveSplit(split.id, 'left')}
                  className="no-drag p-1 rounded text-[var(--c-t6)] hover:text-[var(--c-t2)] hover:bg-[var(--c-btn)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  disabled={i === splits.length - 1}
                  onClick={() => store.moveSplit(split.id, 'right')}
                  className="no-drag p-1 rounded text-[var(--c-t6)] hover:text-[var(--c-t2)] hover:bg-[var(--c-btn)] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          <p className="px-6 pt-3 pb-1 text-[10px] text-[var(--c-t7)] font-mono">
            g+1 through g+{Math.min(splits.length, 9)} to jump by keyboard
          </p>
          {overLimit && (
            <p className="mx-6 mt-2 mb-3 px-3 py-2 rounded-lg bg-[var(--c-btn)] text-[10px] text-[var(--c-t6)] leading-relaxed">
              You have {splits.length} views. Keeping it to {SPLIT_VIEW_SOFT_LIMIT} or fewer tends to help with focus — too many views can fragment your workspace.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Data section ──────────────────────────────────────────────────────────────
function DataSection() {
  const store = useTaskStore()
  const [clearConfirm, setClearConfirm] = useState(false)
  const doneCount = store.tasks.filter(t => t.status === 'done').length

  const handleClear = async () => {
    if (!clearConfirm) { setClearConfirm(true); return }
    const doneIds = store.tasks.filter(t => t.status === 'done').map(t => t.id)
    if (doneIds.length > 0) await store.deleteBulkTasks(doneIds)
    setClearConfirm(false)
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      <div className="px-6 py-3 border-b border-[var(--c-b0)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--c-t2)]">Clear completed</p>
            <p className="text-xs text-[var(--c-t6)] font-mono mt-0.5">
              {doneCount} task{doneCount !== 1 ? 's' : ''} done
            </p>
          </div>
          <button
            onClick={handleClear}
            disabled={doneCount === 0}
            className={`no-drag px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              clearConfirm
                ? 'bg-[var(--c-danger)] text-white hover:opacity-80'
                : 'bg-[var(--c-btn)] text-[var(--c-t3)] hover:bg-[var(--c-btn-h)] disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
          >
            {clearConfirm ? 'confirm?' : 'clear'}
          </button>
        </div>
        {clearConfirm && (
          <p className="mt-2 text-[10px] text-[var(--c-danger)] font-mono leading-relaxed">
            Permanently deletes {doneCount} task{doneCount !== 1 ? 's' : ''}. Click again to confirm.
          </p>
        )}
      </div>
    </div>
  )
}

const SECTION_TITLES: Record<Section, string> = {
  appearance: 'Appearance',
  labels:     'Labels',
  views:      'Views & Projects',
  data:       'Data',
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function SettingsPanel() {
  const store = useTaskStore()
  const isOpen = store.isSettingsOpen
  const [activeSection, setActiveSection] = useState<Section | null>(null)
  const [focusedRootIndex, setFocusedRootIndex] = useState(0)

  // Reset to root when panel closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => { setActiveSection(null); setFocusedRootIndex(0) }, 250)
      return () => clearTimeout(timer)
    } else {
      setFocusedRootIndex(0)
    }
  }, [isOpen])

  // Deep-link from command palette: consume settingsSection once on open
  useEffect(() => {
    if (isOpen && store.settingsSection) {
      setActiveSection(store.settingsSection as Section)
      store.setSettingsSection(null)
    }
  }, [isOpen, store.settingsSection])

  const enterSection = useCallback((s: Section) => {
    setActiveSection(s)
  }, [])

  const goBack = useCallback(() => {
    setActiveSection(null)
    setFocusedRootIndex(0)
  }, [])

  const close = () => store.setSettingsOpen(false)

  // Keyboard navigation — intercept before the global handler
  useEffect(() => {
    if (!isOpen) return

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if (activeSection !== null) {
        // In a section: Backspace or left-arrow goes back (unless typing in an input)
        if (!isInput && (e.key === 'Backspace' || e.key === 'ArrowLeft')) {
          e.preventDefault(); e.stopPropagation(); goBack()
        }
        return
      }

      // On root menu
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation()
        setFocusedRootIndex(i => Math.min(i + 1, SECTIONS.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation()
        setFocusedRootIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault(); e.stopPropagation()
        enterSection(SECTIONS[focusedRootIndex].id)
      }
    }

    window.addEventListener('keydown', handler, true) // capture phase → runs before global handler
    return () => window.removeEventListener('keydown', handler, true)
  }, [isOpen, activeSection, focusedRootIndex, enterSection, goBack])

  const title = activeSection ? SECTION_TITLES[activeSection] : 'Settings'
  const showBack = activeSection !== null

  return (
    <>
      {isOpen && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[280px] border-r border-[var(--c-b2)] bg-[var(--c-panel)] flex flex-col overflow-hidden z-20"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-[var(--c-b1)] shrink-0">
            {showBack ? (
              <>
                <button
                  onClick={goBack}
                  className="no-drag text-xs text-[var(--c-t6)] hover:text-[var(--c-t3)] transition-colors flex items-center gap-1 shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <span className="flex-1 text-sm font-semibold text-[var(--c-t1)] text-center">{title}</span>
              </>
            ) : (
              <h2 className="flex-1 text-sm font-semibold text-[var(--c-t1)]">{title}</h2>
            )}
            <button
              onClick={close}
              className="no-drag text-[var(--c-t7)] hover:text-[var(--c-t4)] transition-colors ml-auto shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {!activeSection ? (
            <div className="flex flex-col flex-1 min-h-0">
              <RootMenu
                onEnter={enterSection}
                focusedIndex={focusedRootIndex}
                setFocusedIndex={setFocusedRootIndex}
              />
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              {activeSection === 'appearance' && <AppearanceSection />}
              {activeSection === 'labels'     && <LabelsSection />}
              {activeSection === 'views'      && <ViewsSection />}
              {activeSection === 'data'        && <DataSection />}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 border-t border-[var(--c-b1)] shrink-0">
            <p className="text-[10px] text-[var(--c-t8)] font-mono">
              {activeSection ? '← back · ⎋ close' : '↑↓ navigate · ↵ open · ⎋ close'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
