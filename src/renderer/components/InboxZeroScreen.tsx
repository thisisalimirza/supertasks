import { useState } from 'react'

// Time-aware greeting
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 5)  return 'Burning the midnight oil'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Winding down'
}

// Stable daily seed — same image all day, new one tomorrow
function getDailySeed(): string {
  return new Date().toISOString().slice(0, 10) // "2025-03-31"
}

interface Props {
  heading?: string
  subheading?: string
  /** When true, shows the time-aware greeting above the heading (default: false) */
  showGreeting?: boolean
}

export default function InboxZeroScreen({
  heading = "You're all done",
  subheading,
  showGreeting = false,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  const seed  = getDailySeed()
  // 1920×1080 landscape from picsum — seed keeps it consistent per day
  const imageUrl = `https://picsum.photos/seed/supertasks-${seed}/1920/1080`

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Gradient backdrop — visible while image loads or on error */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${loaded && !errored ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: 'linear-gradient(135deg, var(--c-elevated) 0%, var(--c-bg) 50%, var(--c-panel) 100%)',
        }}
      />

      {/* Photo */}
      {!errored && (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className={`absolute inset-0 w-full h-full object-cover select-none transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}

      {/* Vignette — bottom-heavy gradient so text is always readable */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 35%, transparent 65%)',
        }}
      />

      {/* Text block */}
      <div className="absolute bottom-14 left-0 right-0 flex flex-col items-center gap-2 select-none">
        {showGreeting && (
          <p className="text-white/50 text-xs font-mono tracking-[0.2em] uppercase">
            {getGreeting()}
          </p>
        )}
        <h2 className="text-white text-[2rem] font-light tracking-[0.08em]">
          {heading}
        </h2>
        {subheading ? (
          <p className="text-white/40 text-[11px] font-mono tracking-wider mt-0.5">
            {subheading}
          </p>
        ) : (
          <p className="text-white/30 text-[10px] font-mono tracking-widest mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>

      {/* Subtle photo credit hint */}
      <div className="absolute bottom-4 right-5 text-white/20 text-[9px] font-mono tracking-wider select-none">
        photo · picsum.photos
      </div>
    </div>
  )
}
