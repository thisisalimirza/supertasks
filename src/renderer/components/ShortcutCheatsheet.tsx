import { useEffect } from 'react'
import { useTaskStore } from '../store/taskStore'
import type { ShortcutDef } from '../hooks/useKeyboard'

interface Props {
  shortcuts: ShortcutDef[]
}

function formatKey(s: ShortcutDef): string {
  const parts: string[] = []
  if (s.meta) parts.push('⌘')
  if (s.shift) parts.push('⇧')
  if (s.alt) parts.push('⌥')
  const keyMap: Record<string, string> = {
    'Escape': '⎋',
    'Enter': '↵',
    'Backspace': '⌫',
    'Tab': '⇥',
    ' ': 'Space',
  }
  parts.push(keyMap[s.key] ?? s.key.toUpperCase())
  return parts.join('')
}

export default function ShortcutCheatsheet({ shortcuts }: Props) {
  const store = useTaskStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); store.setShortcutCheatsheetOpen(false) }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [store])

  // Auto-generate groups from shortcut definitions
  const groups = shortcuts.reduce<Record<string, ShortcutDef[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = []
    acc[s.group].push(s)
    return acc
  }, {})

  // G-chord nav entries
  const navExtra: ShortcutDef[] = [
    { key: 'i', description: 'Go to Inbox', group: 'Navigation', action: () => {} },
    { key: 'a', description: 'Go to All Tasks', group: 'Navigation', action: () => {} },
    { key: 'd', description: 'Go to Done', group: 'Navigation', action: () => {} },
    { key: 't', description: 'Go to Today', group: 'Navigation', action: () => {} },
    { key: 'p', description: 'Go to Project…', group: 'Navigation', action: () => {} },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => store.setShortcutCheatsheetOpen(false)}
    >
      <div
        className="w-[700px] max-h-[80vh] overflow-y-auto bg-[var(--c-surface)] border border-[var(--c-b2)] rounded-2xl shadow-2xl p-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--c-t1)]">Keyboard Shortcuts</h2>
          <button
            onClick={() => store.setShortcutCheatsheetOpen(false)}
            className="text-[var(--c-t6)] hover:text-[var(--c-t4)] transition-colors text-sm"
          >
            ⌘/ to close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <h3 className="text-[10px] font-semibold text-[var(--c-t6)] uppercase tracking-widest mb-3">{group}</h3>
              <div className="space-y-2">
                {items.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--c-t4)]">{s.description}</span>
                    <kbd className="text-xs text-[var(--c-t1)] bg-[var(--c-btn)] border border-[var(--c-b3)] px-2 py-0.5 rounded font-mono">
                      {formatKey(s)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* G-chord section */}
          <div>
            <h3 className="text-[10px] font-semibold text-[var(--c-t6)] uppercase tracking-widest mb-3">Go To (G + key)</h3>
            <div className="space-y-2">
              {navExtra.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--c-t4)]">{s.description}</span>
                  <kbd className="text-xs text-[var(--c-t1)] bg-[var(--c-btn)] border border-[var(--c-b3)] px-2 py-0.5 rounded font-mono">
                    G → {s.key.toUpperCase()}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Theme shortcut */}
          <div>
            <h3 className="text-[10px] font-semibold text-[var(--c-t6)] uppercase tracking-widest mb-3">Appearance</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--c-t4)]">Toggle light / dark mode</span>
                <kbd className="text-xs text-[var(--c-t1)] bg-[var(--c-btn)] border border-[var(--c-b3)] px-2 py-0.5 rounded font-mono">
                  ⌘⇧L
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
