import { Eye, EyeOff, FileUp, RefreshCw, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import AdminWarningBanner from './AdminWarningBanner'
import { useHaushaltsredenEditor } from '../hooks/useHaushaltsredenEditor'

export default function HaushaltsredenEditor() {
  const {
    existingMap,
    disabledYears,
    loading,
    loadError,
    busy,
    confirmDeleteYear,
    allYears,
    totalAvail,
    requestDelete,
    cancelDelete,
    reload,
    toggleYear,
    uploadPdf,
    deletePdf,
  } = useHaushaltsredenEditor()

  return (
    <div className="pb-28">
      {/* Toolbar: reload button */}
      <div className="flex items-center justify-end mb-6">
        <button
          type="button"
          onClick={reload}
          title="Neu laden"
          aria-label="Neu laden"
          className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 hover:border-gray-300 dark:hover:border-gray-600 transition-all backdrop-blur-sm bg-white/40 dark:bg-gray-800/30"
        >
          <RefreshCw size={13} /> <span className="hidden sm:inline">Neu laden</span>
        </button>
      </div>

      {loadError && (
        <div className="mb-5">
          <AdminWarningBanner>
            Dokumente konnten nicht geladen werden.{' '}
            <button
              type="button"
              onClick={reload}
              className="underline font-semibold hover:no-underline"
            >
              Erneut versuchen
            </button>
          </AdminWarningBanner>
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
        Klicken Sie auf „+ PDF" um eine Rede hinzuzufügen. Deaktivierte Jahre werden auf der
        Webseite nicht als „Demnächst" angezeigt.
      </p>

      {/* Animated delete-confirm modal */}
      <AnimatePresence>
        {confirmDeleteYear !== null && (
          <motion.div
            key="delete-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl max-w-xs w-full border border-gray-200/50 dark:border-gray-700/50"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-sm font-semibold dark:text-white mb-1">
                Haushaltsrede {confirmDeleteYear}.pdf löschen?
              </p>
              <p className="text-xs text-gray-400 mb-5">
                Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => cancelDelete()}
                  className="text-xs px-4 py-2 rounded-xl border border-gray-200/60 dark:border-gray-700/40 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const year = confirmDeleteYear
                    cancelDelete()
                    void deletePdf(year)
                  }}
                  className="text-xs px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors"
                >
                  Löschen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-[3px] border-spd-red/20 border-t-spd-red rounded-full animate-spin mb-3" />
          <p className="text-xs text-gray-400">Lade Dokumente…</p>
        </div>
      ) : loadError ? null : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Alle Jahre
              </h3>
              <div className="h-px flex-1 bg-linear-to-r from-gray-200 dark:from-gray-700 to-transparent w-8" />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" /> {totalAvail} online
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-orange-400 rounded-full" />{' '}
                {allYears.length -
                  totalAvail -
                  [...disabledYears].filter(y => !(y in existingMap)).length}{' '}
                fehlen
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />{' '}
                {[...disabledYears].filter(y => !(y in existingMap)).length} ausgeblendet
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {allYears.map((year, idx) => {
              const exists = year in existingMap
              const isDisabled = disabledYears.has(year)
              const isBusy = busy === year

              return (
                <motion.div
                  key={year}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                  className={`relative rounded-2xl p-3 sm:p-4 border transition-all duration-200 group ${
                    exists
                      ? 'bg-white/60 dark:bg-gray-900/40 border-gray-200/50 dark:border-gray-700/40 shadow-sm hover:shadow-md backdrop-blur-sm'
                      : isDisabled
                        ? 'bg-gray-50/40 dark:bg-gray-800/20 border-dashed border-gray-200/30 dark:border-gray-700/30 opacity-40'
                        : 'bg-gray-50/40 dark:bg-gray-800/20 border-dashed border-gray-200/50 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-base font-black tracking-tight ${exists ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}
                    >
                      {year}
                    </span>
                    <span
                      className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        exists
                          ? 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : isDisabled
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                            : 'bg-orange-100/80 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                      }`}
                    >
                      {exists ? '✓ Online' : isDisabled ? 'Aus' : 'Fehlt'}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {isBusy ? (
                      <div className="flex-1 flex justify-center py-2">
                        <div className="w-4 h-4 border-2 border-spd-red/30 border-t-spd-red rounded-full animate-spin" />
                      </div>
                    ) : exists ? (
                      <>
                        <a
                          href={`/documents/fraktion/haushaltsreden/${year}.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center text-[10px] font-semibold py-2 rounded-xl bg-gray-100/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-1"
                        >
                          <Eye size={10} /> Ansehen
                        </a>
                        <label className="text-[10px] font-semibold px-2.5 py-2 rounded-xl bg-gray-100/80 dark:bg-gray-800/60 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer flex items-center">
                          <RefreshCw size={10} />
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) uploadPdf(year, e.target.files[0])
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => requestDelete(year)}
                          className="text-[10px] font-semibold px-2.5 py-2 rounded-xl bg-red-50/80 dark:bg-red-900/15 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="flex-1 text-center text-[10px] font-semibold py-2 rounded-xl border border-dashed border-gray-300/60 dark:border-gray-600/40 text-gray-400 hover:border-spd-red hover:text-spd-red transition-all cursor-pointer flex items-center justify-center gap-1 hover:bg-spd-red/3">
                          <FileUp size={10} /> PDF
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={e => {
                              if (e.target.files?.[0]) uploadPdf(year, e.target.files[0])
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleYear(year)}
                          className={`text-[10px] font-semibold px-2.5 py-2 rounded-xl transition-all flex items-center gap-1 ${
                            isDisabled
                              ? 'bg-blue-50/80 dark:bg-blue-900/15 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
                              : 'bg-gray-100/60 dark:bg-gray-800/40 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {isDisabled ? (
                            <>
                              <Eye size={10} /> Ein
                            </>
                          ) : (
                            <>
                              <EyeOff size={10} /> Aus
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
