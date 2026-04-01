import { motion, AnimatePresence } from 'framer-motion'
import type { TaskPriority } from '../types/task'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none: '',
  low: '#5B6AFF',
  medium: '#FFD700',
  high: '#FF8C00',
  urgent: '#FF4444',
}

interface Props {
  priority: TaskPriority
  size?: 'sm' | 'md'
}

export default function PriorityDot({ priority, size = 'sm' }: Props) {
  const dim = size === 'sm' ? 6 : 8
  const color = PRIORITY_COLORS[priority]

  if (priority === 'none') {
    // Reserve space so layout doesn't shift
    return <span className="inline-block shrink-0" style={{ width: dim, height: dim }} />
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={priority}
        initial={{ scale: 1.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="inline-block rounded-full shrink-0"
        style={{
          width: dim,
          height: dim,
          backgroundColor: color,
          boxShadow: `0 0 6px 2px ${color}44`,
        }}
        title={priority}
      />
    </AnimatePresence>
  )
}
