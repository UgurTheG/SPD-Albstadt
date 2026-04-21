import {useEffect, useState} from 'react'
import {Eye, EyeOff, FileUp, RefreshCw, Trash2} from 'lucide-react'
import {motion} from 'framer-motion'
import {useAdminStore} from '../store'
import {commitBinaryFile, commitFile, deleteFile, getFileContent, listDirectory} from '../lib/github'
import {fileToBase64} from '../lib/images'

export default function HaushaltsredenEditor() {
    const token = useAdminStore(s => s.token)
    const setStatus = useAdminStore(s => s.setStatus)
    const [existingMap, setExistingMap] = useState<Record<number, string>>({})
    const [disabledYears, setDisabledYears] = useState<Set<number>>(new Set())
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<number | null>(null)

    const load = async () => {
        setLoading(true)
        try {
            const [files, config] = await Promise.all([
                listDirectory(token, 'public/documents/fraktion/haushaltsreden'),
                getFileContent(token, 'public/data/haushaltsreden.json'),
            ])
            const map: Record<number, string> = {}
            for (const f of files) {
                const m = f.name.match(/^(\d{4})\.pdf$/i)
                if (m) map[parseInt(m[1])] = f.sha
            }
            setExistingMap(map)
            if (config?.disabledYears) setDisabledYears(new Set(config.disabledYears))
        } catch { /* ignore */
        }
        setLoading(false)
    }

    useEffect(() => {
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    const saveConfig = async (disabled: Set<number>) => {
        const body = {disabledYears: [...disabled].sort((a, b) => a - b)}
        await commitFile(token, 'public/data/haushaltsreden.json', JSON.stringify(body, null, 2) + '\n', 'admin: Haushaltsreden-Konfiguration aktualisiert')
    }

    const toggleYear = async (year: number) => {
        const prev = disabledYears
        const next = new Set(disabledYears)
        if (next.has(year)) next.delete(year); else next.add(year)
        setDisabledYears(next)
        setBusy(year)
        try {
            await saveConfig(next)
            setStatus(`${year} ${next.has(year) ? 'ausgeblendet' : 'eingeblendet'} & gespeichert`, 'success')
        } catch (e) {
            setDisabledYears(prev)
            setStatus('Fehler: ' + (e as Error).message, 'error')
        } finally {
            setBusy(null)
        }
    }

    const uploadPdf = async (year: number, file: File) => {
        setBusy(year)
        try {
            await commitBinaryFile(token, `public/documents/fraktion/haushaltsreden/${year}.pdf`, await fileToBase64(file), `admin: Haushaltsrede ${year}.pdf hochgeladen`)
            setStatus(`${year}.pdf erfolgreich hochgeladen!`, 'success')
            await load()
        } catch (e) {
            setStatus('Fehler: ' + (e as Error).message, 'error')
        }
        setBusy(null)
    }

    const deletePdf = async (year: number) => {
        if (!confirm(`Haushaltsrede ${year}.pdf wirklich löschen?`)) return
        setBusy(year)
        try {
            await deleteFile(token, `public/documents/fraktion/haushaltsreden/${year}.pdf`, `admin: Haushaltsrede ${year}.pdf gelöscht`)
            setStatus(`${year}.pdf gelöscht`, 'success')
            await load()
        } catch (e) {
            setStatus('Fehler: ' + (e as Error).message, 'error')
        }
        setBusy(null)
    }

    const currentYear = new Date().getFullYear()
    const allYears = Array.from({length: currentYear + 1 - 2010}, (_, i) => currentYear - i)
    const totalAvail = allYears.filter(y => y in existingMap).length

    return (
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Klicken Sie auf „+ PDF" um eine Rede hinzuzufügen. Deaktivierte Jahre werden auf der Webseite nicht als
                „Demnächst" angezeigt.
            </p>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <div
                        className="w-10 h-10 border-[3px] border-spd-red/20 border-t-spd-red rounded-full animate-spin mb-3"/>
                    <p className="text-xs text-gray-400">Lade Dokumente…</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Alle
                                Jahre</h3>
                            <div
                                className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent w-8"/>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full"/> {totalAvail} online
              </span>
                            <span className="flex items-center gap-1.5">
                <span
                    className="w-2 h-2 bg-orange-400 rounded-full"/> {allYears.length - totalAvail - [...disabledYears].filter(y => !(y in existingMap)).length} fehlen
              </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {allYears.map((year, idx) => {
                            const exists = year in existingMap
                            const isDisabled = disabledYears.has(year)
                            const isBusy = busy === year

                            return (
                                <motion.div
                                    key={year}
                                    initial={{opacity: 0, y: 10}}
                                    animate={{opacity: 1, y: 0}}
                                    transition={{delay: idx * 0.02, duration: 0.2}}
                                    className={`relative rounded-2xl p-4 border transition-all duration-200 group ${
                                        exists
                                            ? 'bg-white/60 dark:bg-gray-900/40 border-gray-200/50 dark:border-gray-700/40 shadow-sm hover:shadow-md backdrop-blur-sm'
                                            : isDisabled
                                                ? 'bg-gray-50/40 dark:bg-gray-800/20 border-dashed border-gray-200/30 dark:border-gray-700/30 opacity-40'
                                                : 'bg-gray-50/40 dark:bg-gray-800/20 border-dashed border-gray-200/50 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                    <span
                        className={`text-base font-black tracking-tight ${exists ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>
                      {year}
                    </span>
                                        <span
                                            className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                exists
                                                    ? 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : isDisabled
                                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                                        : 'bg-orange-100/80 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                            }`}>
                      {exists ? '✓ Online' : isDisabled ? 'Aus' : 'Fehlt'}
                    </span>
                                    </div>

                                    <div className="flex gap-1.5">
                                        {isBusy ? (
                                            <div className="flex-1 flex justify-center py-2">
                                                <div
                                                    className="w-4 h-4 border-2 border-spd-red/30 border-t-spd-red rounded-full animate-spin"/>
                                            </div>
                                        ) : exists ? (
                                            <>
                                                <a href={`/documents/fraktion/haushaltsreden/${year}.pdf`}
                                                   target="_blank" rel="noopener noreferrer"
                                                   className="flex-1 text-center text-[10px] font-semibold py-2 rounded-xl bg-gray-100/80 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-1">
                                                    <Eye size={10}/> Ansehen
                                                </a>
                                                <label
                                                    className="text-[10px] font-semibold px-2.5 py-2 rounded-xl bg-gray-100/80 dark:bg-gray-800/60 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer flex items-center">
                                                    <RefreshCw size={10}/>
                                                    <input type="file" accept=".pdf" className="hidden" onChange={e => {
                                                        if (e.target.files?.[0]) uploadPdf(year, e.target.files[0])
                                                    }}/>
                                                </label>
                                                <button type="button" onClick={() => deletePdf(year)}
                                                        className="text-[10px] font-semibold px-2.5 py-2 rounded-xl bg-red-50/80 dark:bg-red-900/15 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all">
                                                    <Trash2 size={10}/>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <label
                                                    className="flex-1 text-center text-[10px] font-semibold py-2 rounded-xl border border-dashed border-gray-300/60 dark:border-gray-600/40 text-gray-400 hover:border-spd-red hover:text-spd-red transition-all cursor-pointer flex items-center justify-center gap-1 hover:bg-spd-red/[0.03]">
                                                    <FileUp size={10}/> PDF
                                                    <input type="file" accept=".pdf" className="hidden" onChange={e => {
                                                        if (e.target.files?.[0]) uploadPdf(year, e.target.files[0])
                                                    }}/>
                                                </label>
                                                <button type="button" onClick={() => toggleYear(year)}
                                                        className={`text-[10px] font-semibold px-2.5 py-2 rounded-xl transition-all flex items-center gap-1 ${
                                                            isDisabled
                                                                ? 'bg-blue-50/80 dark:bg-blue-900/15 text-blue-600 dark:text-blue-400 hover:bg-blue-100'
                                                                : 'bg-gray-100/60 dark:bg-gray-800/40 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                        }`}>
                                                    {isDisabled ? <><Eye size={10}/> Ein</> : <><EyeOff
                                                        size={10}/> Aus</>}
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

