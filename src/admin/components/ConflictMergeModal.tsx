/**
 * ConflictMergeModal
 *
 * Shown when auto-merge produced unresolvable conflicts (both this user and
 * another user changed the same field).  The user sees each conflict as a card
 * with "Keep mine" / "Keep theirs" buttons.  Once all conflicts are resolved
 * the "Veröffentlichen" button becomes available.
 */
import { useState } from 'react'
import { AlertTriangle, CheckCircle2, GitMerge, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MergeConflict } from '../lib/merge'
import { summarizeValue } from '../lib/diff'
import { useAdminStore } from '../store'
import { TABS } from '../config/tabs'

interface Props {
  tabKey: string
  conflicts: MergeConflict[]
  onClose: () => void
}

export default function ConflictMergeModal({ tabKey, conflicts, onClose }: Props) {
  const applyMergeResolution = useAdminStore(s => s.applyMergeResolution)
  const publishTab = useAdminStore(s => s.publishTab)
  const state = useAdminStore(s => s.state)
  const publishing = useAdminStore(s => s.publishing)
  const presenceUsers = useAdminStore(s => s.presenceUsers)

  // Users who likely published the conflicting version:
  // they are present but no longer have this tab dirty (they published and reset).
  const conflictAuthors = presenceUsers.filter(u => !u.dirtyTabs.includes(tabKey)).map(u => u.login)

  // Track which value the user picks for each conflict: 'ours' | 'theirs'
  const [choices, setChoices] = useState<Record<number, 'ours' | 'theirs'>>({})

  const allResolved = conflicts.every((_, i) => choices[i] !== undefined)
  const tab = TABS.find(t => t.key === tabKey)

  const handlePublish = async () => {
    if (!allResolved) return

    // Apply user choices onto the currently merged draft in store state
    let resolved = JSON.parse(JSON.stringify(state[tabKey]))
    for (let i = 0; i < conflicts.length; i++) {
      const c = conflicts[i]
      const choice = choices[i] === 'ours' ? c.ours : c.theirs
      resolved = setAtPath(resolved, c.path, choice)
    }

    applyMergeResolution(tabKey, resolved)
    await publishTab(tabKey)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200/60 dark:border-gray-800/60">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <GitMerge size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold dark:text-white">Zusammenführungs-Konflikte</h2>
            <p className="text-[11px] text-gray-400">
              {tab?.label} · {conflicts.length} Konflikt{conflicts.length !== 1 ? 'e' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
          >
            Abbrechen
          </button>
        </div>

        {/* Explanation */}
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200/40 dark:border-amber-800/30">
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1.5">
            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
            Sowohl Sie als auch ein anderer Benutzer haben diese Felder geändert. Wählen Sie für
            jeden Konflikt, welche Version Sie behalten möchten. Danach wird automatisch
            veröffentlicht.
          </p>
          {conflictAuthors.length > 0 && (
            <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
              <User size={11} className="shrink-0" />
              <span>
                Veröffentlicht von:{' '}
                <strong className="font-semibold">{conflictAuthors.join(', ')}</strong>
              </span>
            </p>
          )}
        </div>

        {/* Conflicts list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <AnimatePresence initial={false}>
            {conflicts.map((c, i) => {
              const choice = choices[i]
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl border p-4 transition-colors ${
                    choice
                      ? 'border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10'
                      : 'border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {choice ? (
                      <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                    ) : (
                      <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                    )}
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 font-mono">
                      {c.label}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Ours */}
                    <button
                      type="button"
                      onClick={() => setChoices(p => ({ ...p, [i]: 'ours' }))}
                      className={`text-left rounded-lg border p-3 text-[11px] transition-all ${
                        choice === 'ours'
                          ? 'border-spd-red bg-spd-red/5 dark:bg-spd-red/10 ring-1 ring-spd-red'
                          : 'border-gray-200 dark:border-gray-700 hover:border-spd-red/50 bg-white dark:bg-gray-900'
                      }`}
                    >
                      <p className="font-semibold text-spd-red mb-1 text-[10px] uppercase tracking-wide">
                        Meine Version
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 break-words">
                        {summarizeValue(c.ours, undefined, false) || '—'}
                      </p>
                    </button>

                    {/* Theirs */}
                    <button
                      type="button"
                      onClick={() => setChoices(p => ({ ...p, [i]: 'theirs' }))}
                      className={`text-left rounded-lg border p-3 text-[11px] transition-all ${
                        choice === 'theirs'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 bg-white dark:bg-gray-900'
                      }`}
                    >
                      <p className="font-semibold text-blue-600 dark:text-blue-400 mb-1 text-[10px] uppercase tracking-wide">
                        {conflictAuthors.length > 0
                          ? `Version von ${conflictAuthors.join(', ')}`
                          : 'Veröffentlichte Version'}
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 break-words">
                        {summarizeValue(c.theirs, undefined, false) || '—'}
                      </p>
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">
            {Object.keys(choices).length} / {conflicts.length} aufgelöst
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-medium px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!allResolved || publishing}
              className="text-[11px] font-bold px-4 py-2 rounded-lg bg-spd-red hover:bg-spd-red-dark text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <GitMerge size={12} />
              Zusammenführen & Veröffentlichen
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setAtPath(root: unknown, path: (string | number)[], value: unknown): unknown {
  if (path.length === 0) return value
  const next = Array.isArray(root)
    ? [...(root as unknown[])]
    : { ...(root as Record<string, unknown>) }
  const [head, ...rest] = path as [string | number, ...(string | number)[]]
  ;(next as Record<string | number, unknown>)[head] = setAtPath(
    (root as Record<string | number, unknown>)[head],
    rest,
    value,
  )
  return next
}
