import { useEffect, useState } from 'react'
import { ImageOff, Trash2, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface Props {
  orphans: string[]
  onConfirm: (toDelete: string[]) => void
  onKeep: () => void
  onCancel: () => void
}

export default function OrphanModal({ orphans, onConfirm, onKeep, onCancel }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(orphans.map(o => [o, true])),
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full max-h-[80vh] overflow-y-auto border border-white/50 dark:border-gray-700/50 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <ImageOff size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold dark:text-white">Nicht verwendete Bilder</h3>
              <p className="text-xs text-gray-400">
                {orphans.length} Bild{orphans.length !== 1 ? 'er' : ''} gefunden
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
          Diese Bilder werden nicht mehr referenziert. Möchten Sie sie vom Server löschen?
        </p>

        <div className="space-y-1.5 mb-6">
          {orphans.map(path => (
            <label
              key={path}
              className="flex items-center gap-3 py-2 px-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/40 rounded-xl -mx-1 transition-colors"
            >
              <input
                type="checkbox"
                checked={checked[path]}
                onChange={e => setChecked(prev => ({ ...prev, [path]: e.target.checked }))}
                className="accent-spd-red rounded w-4 h-4"
              />
              <span className="truncate text-xs font-mono text-gray-500">{path}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2 justify-end flex-wrap">
          <button
            type="button"
            className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all hover:bg-gray-50 dark:hover:bg-gray-800/40"
            onClick={onKeep}
          >
            Behalten
          </button>
          <button
            type="button"
            className="text-xs px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:shadow-lg hover:shadow-red-500/25 transition-all flex items-center gap-1.5"
            onClick={() => onConfirm(orphans.filter(p => checked[p]))}
          >
            <Trash2 size={12} /> Löschen
          </button>
          <button
            type="button"
            className="text-xs px-4 py-2.5 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
            onClick={onCancel}
          >
            Abbrechen
          </button>
        </div>
      </motion.div>
    </div>
  )
}
