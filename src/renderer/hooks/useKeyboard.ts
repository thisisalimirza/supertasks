import { useEffect, useRef, useCallback } from 'react'
import { useTaskStore } from '../store/taskStore'

export interface ShortcutDef {
  key: string
  meta?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  group: string
  action: () => void
}

// Single source of truth for all shortcuts.
// The cheatsheet overlay is auto-generated from this array.
export function useKeyboard() {
  const store = useTaskStore()
  const gPressedRef = useRef(false)
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getSelectedId = useCallback(() => {
    const s = useTaskStore.getState()
    const tasks = s.getVisibleTasks()
    return tasks[s.selectedIndex]?.id ?? null
  }, [])

  const shortcuts: ShortcutDef[] = [
    { key: 'k', meta: true, description: 'Open command palette', group: 'Global', action: () => {} },
    { key: '/', meta: true, description: 'Show keyboard shortcuts', group: 'Global', action: () => {} },
    { key: '/', description: 'Open settings', group: 'Global', action: () => {} },
    { key: 'l', meta: true, shift: true, description: 'Toggle light / dark mode', group: 'Global', action: () => {} },
    { key: 'j', description: 'Move down', group: 'Navigation', action: () => {} },
    { key: 'k', description: 'Move up', group: 'Navigation', action: () => {} },
    { key: 'Escape', description: 'Close / go back', group: 'Navigation', action: () => {} },
    { key: 'Enter', description: 'Open selected task', group: 'Navigation', action: () => {} },
    { key: 'c', description: 'Create new task', group: 'Tasks', action: () => {} },
    { key: 'e', description: 'Edit selected task title', group: 'Tasks', action: () => {} },
    { key: 'd', description: 'Toggle done', group: 'Tasks', action: () => {} },
    { key: 's', description: 'Star / priority flag', group: 'Tasks', action: () => {} },
    { key: 'r', description: 'Set due date', group: 'Tasks', action: () => {} },
    { key: 'h', description: 'Hold until (start date)', group: 'Tasks', action: () => {} },
    { key: 'l', description: 'Edit labels', group: 'Tasks', action: () => {} },
    { key: 'm', description: 'Assign project', group: 'Tasks', action: () => {} },
    { key: 'Tab', description: 'Focus notes (in detail)', group: 'Tasks', action: () => {} },
    { key: 'z', meta: true, description: 'Undo last action', group: 'Global', action: () => {} },
    { key: 'x', description: 'Select task (bulk)', group: 'Tasks', action: () => {} },
    { key: 'Backspace', description: 'Delete task (2× confirm)', group: 'Tasks', action: () => {} },
    { key: 'd', meta: true, description: 'Mark all selected done', group: 'Bulk', action: () => {} },
    { key: 'Backspace', meta: true, description: 'Delete all selected', group: 'Bulk', action: () => {} },
  ]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = useTaskStore.getState()
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // ── Escape: always fires ─────────────────────────────────────────────
      if (e.key === 'Escape' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        if (s.isCommandPaletteOpen) { s.setCommandPaletteOpen(false); return }
        if (s.isShortcutCheatsheetOpen) { s.setShortcutCheatsheetOpen(false); return }
        if (s.isProjectNavOpen) { s.setProjectNavOpen(false); return }
        if (s.isSplitEditorOpen) { s.setSplitEditorOpen(false); return }
        if (s.isSettingsOpen) { s.setSettingsOpen(false); return }
        if (s.isNewProjectOpen) { s.setNewProjectOpen(false); return }
        if (s.activePicker) { s.closePicker(); return }
        if (s.isDetailOpen) { s.closeDetail(); return }
        if (s.selectedTaskIds.size > 0) { s.clearSelection(); return }
        return
      }

      // / without modifier toggles settings — must run before the blocker so it works while settings is open
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !isInput) {
        e.preventDefault(); s.setSettingsOpen(!s.isSettingsOpen); return
      }

      // Block all other shortcuts when palette / cheatsheet / project nav / split editor / settings open
      if (s.isCommandPaletteOpen || s.isShortcutCheatsheetOpen || s.isProjectNavOpen || s.isSplitEditorOpen || s.isSettingsOpen) return

      // Block shortcuts when a picker is open (picker owns keyboard)
      if (s.activePicker) return

      // ── G chord ──────────────────────────────────────────────────────────
      if (!isInput && e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        gPressedRef.current = true
        if (gTimerRef.current) clearTimeout(gTimerRef.current)
        gTimerRef.current = setTimeout(() => { gPressedRef.current = false }, 1000)
        return
      }

      if (gPressedRef.current && !isInput) {
        gPressedRef.current = false
        if (gTimerRef.current) clearTimeout(gTimerRef.current)
        switch (e.key) {
          case 'i': e.preventDefault(); s.setView('inbox'); return
          case 'a': e.preventDefault(); s.setView('all'); return
          case 'd': e.preventDefault(); s.setView('done'); return
          case 't': e.preventDefault(); s.setView('today'); return
          case 'n': e.preventDefault(); s.setView('tomorrow'); return
          case 'w': e.preventDefault(); s.setView('week'); return
          case 'p': e.preventDefault(); s.setProjectNavOpen(true); return
          default: {
            // g+1 through g+9 — jump to Nth enabled split
            const num = parseInt(e.key)
            if (num >= 1 && num <= 9) {
              e.preventDefault()
              const splits = s.splits.filter(sp => sp.enabled).sort((a, b) => a.sortOrder - b.sortOrder)
              const target = splits[num - 1]
              if (target) s.setActiveSplit(target.id)
            }
          }
        }
      }

      // ── Cmd+Z undo ────────────────────────────────────────────────────────
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && !isInput) {
        e.preventDefault(); s.undo(); return
      }

      // ── Global shortcuts ─────────────────────────────────────────────────
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); s.setCommandPaletteOpen(true); return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault(); s.setShortcutCheatsheetOpen(true); return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault(); s.toggleTheme(); return
      }

      // ArrowLeft closes detail — but only if the focused input is empty (don't steal cursor movement)
      if (e.key === 'ArrowLeft' && !e.metaKey && s.isDetailOpen) {
        const inputEl = target as HTMLInputElement | HTMLTextAreaElement
        const isEmpty = !isInput || (inputEl.value ?? '').length === 0
        if (isEmpty) { e.preventDefault(); s.closeDetail(); return }
      }

      // Skip everything below if input focused
      if (isInput) return

      // ── Enter — open detail ───────────────────────────────────────────────
      if (e.key === 'Enter' && !e.metaKey) {
        const tasks = s.getVisibleTasks()
        const id = tasks[s.selectedIndex]?.id
        if (id) { e.preventDefault(); s.openDetail(id) }
        return
      }

      // ── Tab — cycle all tabs (or focus notes when detail is open) ─────────
      if (e.key === 'Tab' && !e.metaKey) {
        e.preventDefault()
        if (s.isDetailOpen) {
          window.dispatchEvent(new Event('supertasks:focus-notes'))
        } else {
          s.navigateTabRelative(e.shiftKey ? -1 : 1)
        }
        return
      }

      // ── Cmd+J / Cmd+K / Cmd+Arrow — reorder task(s) ────────────────────
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'j' || e.key === 'ArrowDown')) {
        e.preventDefault()
        const tasks = s.getVisibleTasks()
        // If there's a multi-selection, pass any selected id — reorderTask handles the group
        const id = s.selectedTaskIds.size > 0
          ? tasks.find(t => s.selectedTaskIds.has(t.id))?.id
          : tasks[s.selectedIndex]?.id
        if (id) s.reorderTask(id, 1)
        return
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'k' || e.key === 'ArrowUp')) {
        e.preventDefault()
        const tasks = s.getVisibleTasks()
        const id = s.selectedTaskIds.size > 0
          ? tasks.find(t => s.selectedTaskIds.has(t.id))?.id
          : tasks[s.selectedIndex]?.id
        if (id) s.reorderTask(id, -1)
        return
      }

      // ── Shift+J / Shift+K / Shift+Arrow — extend selection ──────────────
      if (e.shiftKey && !e.metaKey && (e.key === 'j' || e.key === 'ArrowDown')) {
        e.preventDefault(); s.extendSelection(1); return
      }
      if (e.shiftKey && !e.metaKey && (e.key === 'k' || e.key === 'ArrowUp')) {
        e.preventDefault(); s.extendSelection(-1); return
      }

      // ── J / K / Arrow navigation ─────────────────────────────────────────
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); s.moveSelection(1); return }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); s.moveSelection(-1); return }

      // ── Arrow Right / Left — open / close detail ─────────────────────────
      if (e.key === 'ArrowRight' && !e.metaKey) {
        const tasks = s.getVisibleTasks()
        const id = tasks[s.selectedIndex]?.id
        if (id && !s.isDetailOpen) { e.preventDefault(); s.openDetail(id) }
        return
      }
      if (e.key === 'ArrowLeft' && !e.metaKey) {
        if (s.isDetailOpen) { e.preventDefault(); s.closeDetail() }
        return
      }

      // ── Task actions ─────────────────────────────────────────────────────
      if (e.key === 'c') {
        e.preventDefault()
        if (!s.isDetailOpen) s.setCreating(true)
        return
      }
      if (e.key === 'e') {
        e.preventDefault()
        const id = getSelectedId()
        if (id && !s.isDetailOpen) s.setEditingTaskId(id)
        return
      }
      if (e.key === 'd' && !e.metaKey) {
        e.preventDefault()
        const id = getSelectedId()
        if (id) s.toggleDone(id)
        return
      }
      if (e.key === 's') {
        e.preventDefault()
        const id = getSelectedId()
        if (id) s.toggleStar(id)
        return
      }
      // ! — cycle priority
      if (e.key === '!') {
        e.preventDefault()
        if (s.selectedTaskIds.size > 0) {
          s.selectedTaskIds.forEach(id => s.cyclePriority(id))
        } else {
          const id = getSelectedId()
          if (id) s.cyclePriority(id)
        }
        return
      }
      // R — due date picker
      if (e.key === 'r') {
        e.preventDefault()
        const id = getSelectedId()
        if (id) s.setActivePicker('due', id)
        return
      }
      // H — start date (hold until) picker
      if (e.key === 'h') {
        e.preventDefault()
        const id = getSelectedId()
        if (id) s.setActivePicker('startDate', id)
        return
      }
      // L — label picker
      if (e.key === 'l' && !e.metaKey) {
        e.preventDefault()
        const id = getSelectedId()
        if (id) s.setActivePicker('label', id)
        return
      }
      // M — project picker
      if (e.key === 'm') {
        e.preventDefault()
        const id = getSelectedId()
        if (id) s.setActivePicker('project', id)
        return
      }
      if (e.key === 'x') {
        e.preventDefault()
        const id = getSelectedId()
        if (id) s.toggleSelectTask(id)
        return
      }
      // Backspace — delete selection (bulk if multi-selected, else single)
      if (e.key === 'Backspace' && !e.metaKey) {
        e.preventDefault()
        if (s.selectedTaskIds.size > 0) {
          s.deleteBulkTasks(Array.from(s.selectedTaskIds))
          s.clearSelection()
        } else {
          const id = getSelectedId()
          if (id) s.deleteTask(id)
        }
        return
      }

      // ── Bulk actions ─────────────────────────────────────────────────────
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        if (s.selectedTaskIds.size > 0) {
          s.selectedTaskIds.forEach(id => s.toggleDone(id))
          s.clearSelection()
        }
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault()
        if (s.selectedTaskIds.size > 0) {
          s.deleteBulkTasks(Array.from(s.selectedTaskIds))
        }
        return
      }
    }

    window.addEventListener('keydown', handler)

    // Register escape via contextBridge — fires even when Electron intercepts the key
    const escapeHandler = () => {
      const s = useTaskStore.getState()
      if (s.isCommandPaletteOpen) s.setCommandPaletteOpen(false)
      else if (s.isShortcutCheatsheetOpen) s.setShortcutCheatsheetOpen(false)
      else if (s.isProjectNavOpen) s.setProjectNavOpen(false)
      else if (s.isSplitEditorOpen) s.setSplitEditorOpen(false)
      else if (s.isSettingsOpen) s.setSettingsOpen(false)
      else if (s.isNewProjectOpen) s.setNewProjectOpen(false)
      else if (s.activePicker) s.closePicker()
      else if (s.editingTaskId) s.setEditingTaskId(null)
      else if (s.isCreating) s.setCreating(false)
      else if (s.isDetailOpen) s.closeDetail()
      else if (s.selectedTaskIds.size > 0) s.clearSelection()
    }
    const removeEscapeHandler = window.api?.onEscape?.(escapeHandler)

    return () => {
      window.removeEventListener('keydown', handler)
      removeEscapeHandler?.()
    }
  }, [getSelectedId])

  return shortcuts
}
