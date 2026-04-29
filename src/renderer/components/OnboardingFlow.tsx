import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTaskStore } from '../store/taskStore'

type Choice = 'fresh' | 'demo' | null

const ESSENTIAL_SHORTCUTS = [
  { keys: ['J', 'K'],      label: 'Move between tasks' },
  { keys: ['→'],           label: 'Open task detail' },
  { keys: ['C'],           label: 'Create a task' },
  { keys: ['D'],           label: 'Mark done' },
  { keys: ['S'],           label: 'Star a task' },
  { keys: ['1–4'],         label: 'Set priority' },
  { keys: ['⌘K'],          label: 'Command palette' },
  { keys: ['⌥', 'Space'],  label: 'Quick add from anywhere' },
]

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--c-btn)] border border-[var(--c-b3)] text-[var(--c-t1)] text-xs font-mono leading-none">
      {children}
    </kbd>
  )
}

const variants = {
  enter:  { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit:   { opacity: 0, y: -16 },
}

export default function OnboardingFlow() {
  const [step, setStep]     = useState(0)
  const [choice, setChoice] = useState<Choice>(null)
  const [loading, setLoading] = useState(false)
  const completeOnboarding  = useTaskStore(s => s.completeOnboarding)

  const handleChoice = (c: Choice) => {
    setChoice(c)
    setStep(1)
  }

  const handleStart = async () => {
    if (loading) return
    setLoading(true)
    await completeOnboarding(choice === 'demo')
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--c-bg)] select-none">
      {/* Step dots */}
      <div className="absolute top-8 flex gap-2">
        {[0, 1].map(i => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              i === step ? 'bg-[var(--c-accent)]' : 'bg-[var(--c-b3)]'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="welcome"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col items-center gap-8 max-w-[480px] w-full px-8"
          >
            {/* Logo mark */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5B47E0] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-[#5B47E0]/30">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <circle cx="8" cy="9"  r="3.5" stroke="white" strokeOpacity=".9" strokeWidth="2" />
                <polyline points="6.5,9 7.8,10.4 10,7.2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="13.5" y="7.8" width="10" height="2.4" rx="1.2" fill="white" fillOpacity=".35" />
                <circle cx="8" cy="15" r="3.5" stroke="white" strokeOpacity=".9" strokeWidth="2" />
                <polyline points="6.5,15 7.8,16.4 10,13.2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="13.5" y="13.8" width="8"  height="2.4" rx="1.2" fill="white" fillOpacity=".35" />
                <circle cx="8" cy="21" r="3.5" stroke="white" strokeOpacity=".5" strokeWidth="2" />
                <rect x="13.5" y="19.8" width="6"  height="2.4" rx="1.2" fill="white" fillOpacity=".2" />
              </svg>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-semibold text-[var(--c-t1)] tracking-tight mb-2">
                Welcome to Supertasks
              </h1>
              <p className="text-sm text-[var(--c-t5)] leading-relaxed">
                A keyboard-first task manager. How would you like to start?
              </p>
            </div>

            <div className="flex gap-4 w-full">
              {/* Fresh start card */}
              <button
                onClick={() => handleChoice('fresh')}
                className="no-drag flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[var(--c-b2)] hover:border-[var(--c-accent)] bg-[var(--c-surface)] hover:bg-[var(--c-hover)] transition-all duration-150 group"
              >
                <span className="text-2xl">✦</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--c-t2)] group-hover:text-[var(--c-t1)] transition-colors">
                    Fresh start
                  </p>
                  <p className="text-xs text-[var(--c-t6)] mt-1 leading-relaxed">
                    Empty inbox, ready to go
                  </p>
                </div>
              </button>

              {/* Demo data card */}
              <button
                onClick={() => handleChoice('demo')}
                className="no-drag flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[var(--c-b2)] hover:border-[var(--c-accent)] bg-[var(--c-surface)] hover:bg-[var(--c-hover)] transition-all duration-150 group"
              >
                <span className="text-2xl">◈</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[var(--c-t2)] group-hover:text-[var(--c-t1)] transition-colors">
                    Try with sample data
                  </p>
                  <p className="text-xs text-[var(--c-t6)] mt-1 leading-relaxed">
                    Pre-filled tasks to explore
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="shortcuts"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col items-center gap-7 max-w-[420px] w-full px-8"
          >
            <div className="text-center">
              <h2 className="text-xl font-semibold text-[var(--c-t1)] tracking-tight mb-2">
                Built for the keyboard
              </h2>
              <p className="text-sm text-[var(--c-t5)] leading-relaxed">
                You can do everything without touching the mouse. Here are the essentials:
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {ESSENTIAL_SHORTCUTS.map(({ keys, label }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--c-t4)]">{label}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((k, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <Kbd>{k}</Kbd>
                        {i < keys.length - 1 && (
                          <span className="text-[10px] text-[var(--c-t7)]">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-[var(--c-t7)] font-mono">
              Press ⌘/ anytime to see all shortcuts
            </p>

            <button
              onClick={handleStart}
              disabled={loading}
              className="no-drag w-full py-2.5 rounded-xl bg-[var(--c-accent)] hover:opacity-90 active:opacity-80 transition-opacity text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up…' : 'Get started →'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
