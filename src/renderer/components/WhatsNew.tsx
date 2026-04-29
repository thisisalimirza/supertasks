import { useEffect } from 'react'

interface Props {
  version: string
  onDismiss: () => void
}

// Add a new entry here for each release that has user-facing changes.
// Key = version string matching package.json. Oldest entries can be pruned over time.
const CHANGELOGS: Record<string, { emoji: string; title: string; detail?: string }[]> = {
  '1.0.2': [
    {
      emoji: '👋',
      title: 'Onboarding for new users',
      detail: 'First-time users now choose between a fresh start or sample data, and get a quick keyboard shortcuts intro.',
    },
    {
      emoji: '⌨️',
      title: 'Priority no longer auto-sorts',
      detail: 'Changing a task\'s priority (1–4) keeps it in place. Use ⌘J / ⌘K to reorder manually.',
    },
    {
      emoji: '✓',
      title: 'Done tasks hide in project views',
      detail: 'Completing a task in a project or split view makes it disappear immediately. Click "show completed" in the header to reveal them.',
    },
    {
      emoji: '🪟',
      title: 'Slim window mode',
      detail: 'The app can now be resized much narrower for a focused, notepad-style layout.',
    },
    {
      emoji: '🗂',
      title: 'Smarter navigation bar',
      detail: 'Project tabs now wrap to new lines instead of scrolling. The active view name doubles as the heading — no more repetition.',
    },
  ],
}

export default function WhatsNew({ version, onDismiss }: Props) {
  const items = CHANGELOGS[version]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onDismiss() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onDismiss])

  if (!items) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="w-[440px] bg-[var(--c-surface)] border border-[var(--c-b2)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-[var(--c-b1)]">
          <p className="text-[10px] font-mono text-[var(--c-t7)] uppercase tracking-widest mb-1">
            Version {version}
          </p>
          <h2 className="text-lg font-semibold text-[var(--c-t1)] tracking-tight">
            What's new in Supertasks
          </h2>
        </div>

        {/* Changelog items */}
        <div className="px-7 py-5 space-y-4">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3.5">
              <span className="text-lg leading-none mt-0.5 shrink-0">{item.emoji}</span>
              <div>
                <p className="text-sm font-medium text-[var(--c-t2)]">{item.title}</p>
                {item.detail && (
                  <p className="text-xs text-[var(--c-t6)] mt-0.5 leading-relaxed">{item.detail}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-7 pb-6 pt-1">
          <button
            onClick={onDismiss}
            className="no-drag w-full py-2 rounded-xl bg-[var(--c-accent)] hover:opacity-90 active:opacity-80 transition-opacity text-white text-sm font-semibold"
          >
            Got it →
          </button>
        </div>
      </div>
    </div>
  )
}
