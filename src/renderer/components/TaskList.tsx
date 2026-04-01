import { useEffect, useRef, useState } from 'react'
import { useTaskStore, getProjectColor } from '../store/taskStore'
import TaskRow from './TaskRow'
import InlineTaskCreator from './InlineTaskCreator'
import DueDatePicker from './pickers/DueDatePicker'
import StartDatePicker from './pickers/StartDatePicker'
import LabelPicker from './pickers/LabelPicker'
import ProjectPicker from './pickers/ProjectPicker'
import InboxZeroScreen from './InboxZeroScreen'
import type { Split } from '../types/task'

// ── Right-click context menu for split tabs ───────────────────────────────────
interface ContextMenuState {
  splitId: string
  x: number
  y: number
}

function SplitContextMenu({ state, onClose }: { state: ContextMenuState; onClose: () => void }) {
  const store = useTaskStore()
  const split = store.splits.find(s => s.id === state.splitId)
  if (!split) return null

  const items = [
    {
      label: 'Edit Split',
      action: () => { store.setSplitEditorOpen(true, split.id); onClose() }
    },
    {
      label: split.enabled ? 'Disable Split' : 'Enable Split',
      action: () => { store.updateSplit(split.id, { enabled: !split.enabled }); onClose() }
    },
    {
      label: 'Move Left',
      action: () => { store.moveSplit(split.id, 'left'); onClose() }
    },
    {
      label: 'Move Right',
      action: () => { store.moveSplit(split.id, 'right'); onClose() }
    },
    {
      label: 'Delete Split',
      danger: true,
      action: () => { store.deleteSplit(split.id); onClose() }
    },
  ]

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="fixed z-[61] bg-[var(--c-surface)] border border-[var(--c-b2)] rounded-lg shadow-xl overflow-hidden py-1 min-w-[160px]"
        style={{ top: state.y, left: state.x }}
      >
        {items.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--c-cmd-row)] ${
              item.danger ? 'text-[var(--c-danger)]' : 'text-[var(--c-t2)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}

// ── View headings ─────────────────────────────────────────────────────────────
const VIEW_HEADINGS: Record<string, string> = {
  inbox: 'Inbox',
  today: 'Today',
  tomorrow: 'Tomorrow',
  week: 'This Week',
  upcoming: 'Upcoming',
  all: 'All Tasks',
  done: 'Done',
  project: '',
  split: '',
}

const BUILTIN_VIEWS = ['inbox', 'today', 'upcoming', 'all', 'done'] as const

// ── Per-view empty state messaging ───────────────────────────────────────────
interface EmptyStateConfig {
  heading: string
  subheading?: string
  showGreeting?: boolean
  /** Optional action button rendered below the photo text */
  actionLabel?: string
}

function getEmptyConfig(
  view: string,
  activeSplit: { id: string; name: string } | null,
  selectedProject: string | null,
): EmptyStateConfig {
  if (view === 'inbox') {
    return { heading: "You're all done", showGreeting: true }
  }
  if (view === 'today') {
    return { heading: 'Clear for today', showGreeting: true }
  }
  if (view === 'tomorrow') {
    return { heading: 'Nothing due tomorrow', subheading: 'Tasks with a due date of tomorrow will appear here' }
  }
  if (view === 'week') {
    return { heading: 'Clear this week', subheading: 'Tasks due in the next 7 days will appear here', showGreeting: true }
  }
  if (view === 'upcoming') {
    return {
      heading: 'Nothing upcoming',
      subheading: 'Hold a task with H to schedule it ahead',
    }
  }
  if (view === 'all') {
    return {
      heading: 'All clear',
      subheading: 'Press C to create your first task',
    }
  }
  if (view === 'done') {
    return {
      heading: 'Nothing completed',
      subheading: 'Completed tasks will appear here',
    }
  }
  if (view === 'split' && activeSplit) {
    return {
      heading: `${activeSplit.name} is empty`,
      subheading: 'No tasks match these filters',
      actionLabel: 'Edit Split',
    }
  }
  if (view === 'project' && selectedProject) {
    return {
      heading: selectedProject,
      subheading: 'No tasks in this project yet · press C to add one',
    }
  }
  return { heading: 'Nothing here', subheading: 'Press C to create a task' }
}

export default function TaskList() {
  const store = useTaskStore()
  const tasks = store.getVisibleTasks()
  const containerRef = useRef<HTMLDivElement>(null)
  const tabBarRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Scroll selected item into view
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-index="${store.selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [store.selectedIndex])

  // Scroll active split tab into view in the tab bar
  useEffect(() => {
    if (store.activeView === 'split' && tabBarRef.current) {
      const activeBtn = tabBarRef.current.querySelector('[data-active-split="true"]') as HTMLElement
      activeBtn?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }, [store.activeSplitId])

  const enabledSplits = store.splits
    .filter(s => s.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const activeSplit = store.activeView === 'split'
    ? store.splits.find(s => s.id === store.activeSplitId) ?? null
    : null

  const heading = activeSplit
    ? activeSplit.name
    : store.activeView === 'project' && store.selectedProject
      ? store.selectedProject
      : VIEW_HEADINGS[store.activeView] ?? store.activeView

  const handleSplitContextMenu = (e: React.MouseEvent, splitId: string) => {
    e.preventDefault()
    setContextMenu({ splitId, x: e.clientX, y: e.clientY })
  }

  // Full-bleed photo mode whenever the current view is empty
  const isEmpty = tasks.length === 0 && !store.isCreating
  const emptyConfig = isEmpty
    ? getEmptyConfig(store.activeView, activeSplit, store.selectedProject ?? null)
    : null

  return (
    <div className={`flex flex-col h-full relative ${isEmpty ? '' : 'bg-[var(--c-bg)]'}`}>

      {/* Full-bleed photo backdrop — fixed to viewport so it bleeds behind title and status bars */}
      {isEmpty && emptyConfig && (
        <div className="fixed inset-0" style={{ zIndex: 1 }}>
          <InboxZeroScreen
            heading={emptyConfig.heading}
            subheading={emptyConfig.subheading}
            showGreeting={emptyConfig.showGreeting}
          />
        </div>
      )}

      {/* Single unified top gradient — fixed from pixel 0, covers TitleBar + view header as one */}
      {isEmpty && (
        <div
          className="fixed top-0 inset-x-0 pointer-events-none"
          style={{ height: '160px', zIndex: 8, background: 'linear-gradient(to bottom, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 50%, transparent 100%)' }}
        />
      )}

      {/* Optional action button overlaid above the photo credit */}
      {isEmpty && emptyConfig?.actionLabel && activeSplit && (
        <button
          onClick={() => store.setSplitEditorOpen(true, activeSplit.id)}
          className="no-drag absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-xs text-white/40 hover:text-white/80 transition-colors underline underline-offset-2"
        >
          {emptyConfig.actionLabel}
        </button>
      )}

      {/* View header — floats over photo when empty */}
      <div className="flex items-center justify-between px-6 py-5 shrink-0 relative z-10">
        <div>
          <h1 className={`text-xl font-semibold tracking-tight flex items-center gap-2 transition-colors duration-300 ${
            isEmpty ? 'text-white/90' : 'text-[var(--c-t1)]'
          }`}>
            {(store.activeView === 'project' || (store.activeView === 'split' && !activeSplit)) && (
              <span className={isEmpty ? 'text-white/50' : 'text-[var(--c-t6)]'}>◈</span>
            )}
            {heading}
          </h1>
          <p className={`text-xs mt-0.5 font-mono transition-colors duration-300 ${
            isEmpty ? 'text-white/40' : 'text-[var(--c-t8)]'
          }`}>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            {store.selectedTaskIds.size > 0 && (
              <span className="ml-2 text-[var(--c-accent)]">· {store.selectedTaskIds.size} selected</span>
            )}
          </p>
        </div>

        {/* Tab bar — built-ins + splits + add button */}
        <div className="flex items-center gap-1 min-w-0">
          {/* Built-in tabs */}
          <div className="flex gap-1 shrink-0">
            {BUILTIN_VIEWS.map(view => (
              <button
                key={view}
                onClick={() => store.setView(view)}
                className={`no-drag px-3 py-1 rounded text-xs font-medium transition-colors ${
                  isEmpty
                    ? store.activeView === view
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                    : store.activeView === view
                      ? 'bg-[var(--c-btn)] text-[var(--c-t1)]'
                      : 'text-[var(--c-t6)] hover:text-[var(--c-t4)]'
                }`}
              >
                {VIEW_HEADINGS[view]}
              </button>
            ))}
          </div>

          {/* Divider */}
          {enabledSplits.length > 0 && (
            <div className={`w-px h-4 mx-1 shrink-0 ${isEmpty ? 'bg-white/20' : 'bg-[var(--c-b3)]'}`} />
          )}

          {/* Split tabs */}
          {enabledSplits.length > 0 && (
            <div
              ref={tabBarRef}
              className="flex gap-1 overflow-x-auto scrollbar-none max-w-[260px]"
              style={{ maskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}
            >
              {enabledSplits.map(split => {
                const count = store.getSplitTaskCount(split.id)
                const isActive = store.activeView === 'split' && store.activeSplitId === split.id
                // Use the first project in the split's rules for the color dot
                const splitColor = split.rules.projects.length === 1
                  ? getProjectColor(split.rules.projects[0], store.projects)
                  : null
                return (
                  <button
                    key={split.id}
                    data-active-split={isActive ? 'true' : undefined}
                    onClick={() => store.setActiveSplit(split.id)}
                    onContextMenu={e => handleSplitContextMenu(e, split.id)}
                    className={`no-drag flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
                      isEmpty
                        ? isActive ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                        : isActive ? 'bg-[var(--c-btn)] text-[var(--c-t1)]' : 'text-[var(--c-t6)] hover:text-[var(--c-t4)]'
                    }`}
                  >
                    {splitColor && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-80" style={{ backgroundColor: splitColor }} />
                    )}
                    <span>{split.name}</span>
                    {count > 0 && (
                      <span className={`text-[9px] font-mono tabular-nums ${
                        isEmpty ? 'text-white/40' : isActive ? 'text-[var(--c-accent)]' : 'text-[var(--c-t7)]'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Add split button */}
          <button
            onClick={() => store.setSplitEditorOpen(true, null)}
            className={`no-drag ml-1 w-6 h-6 flex items-center justify-center rounded transition-colors shrink-0 text-sm ${
              isEmpty
                ? 'text-white/40 hover:text-white/70 hover:bg-white/10'
                : 'text-[var(--c-t7)] hover:text-[var(--c-t3)] hover:bg-[var(--c-btn)]'
            }`}
            title="New Split View"
          >
            +
          </button>
        </div>
      </div>

      {/* Inline creator */}
      {store.isCreating && <InlineTaskCreator />}

      {/* Task list — transparent when empty so backdrop photo shows through */}
      <div ref={containerRef} className="flex-1 overflow-y-auto relative" onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null) }}>
        {tasks.length === 0 ? null : (() => {
              const rows: React.ReactNode[] = []
              let lastProject: string | null = undefined as unknown as null

              tasks.forEach((task, index) => {
                // Project group headers for 'all' view
                if (store.activeView === 'all') {
                  const proj = task.project || null
                  if (proj !== lastProject) {
                    lastProject = proj
                    rows.push(
                      <div key={`group-${proj ?? '__none__'}`} className="px-6 pt-4 pb-1">
                        <span className="text-[10px] font-semibold text-[var(--c-t7)] uppercase tracking-widest flex items-center gap-1.5">
                          {proj ? <><span>◈</span>{proj}</> : 'No Project'}
                        </span>
                      </div>
                    )
                  }
                }

                rows.push(
                  <div
                    key={task.id}
                    data-index={index}
                    draggable
                    onDragStart={() => setDragSourceId(task.id)}
                    onDragOver={(e) => { e.preventDefault(); if (dragOverId !== task.id) setDragOverId(task.id) }}
                    onDrop={() => {
                      if (dragSourceId && dragSourceId !== task.id) {
                        store.moveTaskToPosition(dragSourceId, task.id)
                      }
                      setDragSourceId(null)
                      setDragOverId(null)
                    }}
                    onDragEnd={() => { setDragSourceId(null); setDragOverId(null) }}
                  >
                    <TaskRow
                      task={task}
                      isSelected={index === store.selectedIndex}
                      isChecked={store.selectedTaskIds.has(task.id)}
                      isDragOver={dragOverId === task.id && dragSourceId !== task.id}
                      isDragging={dragSourceId === task.id}
                    />
                  </div>
                )

                // Inline pickers after selected task
                if (index === store.selectedIndex) {
                  const pickerTaskId = store.pickerTaskId ?? task.id
                  if (store.activePicker === 'due') {
                    rows.push(<DueDatePicker key={`picker-due-${task.id}`} taskId={pickerTaskId} />)
                  }
                  if (store.activePicker === 'startDate') {
                    rows.push(<StartDatePicker key={`picker-start-${task.id}`} taskId={pickerTaskId} />)
                  }
                  if (store.activePicker === 'label') {
                    rows.push(<LabelPicker key={`picker-label-${task.id}`} taskId={pickerTaskId} />)
                  }
                  if (store.activePicker === 'project') {
                    rows.push(<ProjectPicker key={`picker-project-${task.id}`} taskId={pickerTaskId} />)
                  }
                }
              })

              return rows
        })()}
      </div>

      {/* Right-click context menu */}
      {contextMenu && (
        <SplitContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
