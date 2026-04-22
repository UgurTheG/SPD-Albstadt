import {ArrowRight} from 'lucide-react'
import {type ChangeEntry, summarizeValue} from '../lib/diff'

export function FieldChangeDiff({entry}: { entry: ChangeEntry }) {
    const t = entry.fieldType
    if (entry.pendingImagePath) {
        const filename = entry.pendingImagePath.split('/').pop() || entry.pendingImagePath
        return (
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                Neues Bild hochgeladen · <span className="font-mono text-gray-700 dark:text-gray-300">{filename}</span>
            </div>
        )
    }
    const isTextish = t === 'textarea' || t === 'text' || t === 'email' || t === 'url'
    if (isTextish && typeof entry.before === 'string' && typeof entry.after === 'string') {
        return <div className="text-[11px]"><InlineDiff oldVal={entry.before} newVal={entry.after}/></div>
    }
    return (
        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 min-w-0 flex-wrap">
            <span className="line-through text-gray-400 dark:text-gray-500">
                {summarizeValue(entry.before, t, false)}
            </span>
            <ArrowRight size={10} className="shrink-0 text-gray-400"/>
            <span className="font-medium text-gray-700 dark:text-gray-300">
                {summarizeValue(entry.after, t, false)}
            </span>
        </div>
    )
}

export function InlineDiff({oldVal, newVal}: { oldVal?: unknown; newVal?: unknown }) {
    const a = typeof oldVal === 'string' ? oldVal : JSON.stringify(oldVal ?? '')
    const b = typeof newVal === 'string' ? newVal : JSON.stringify(newVal ?? '')

    if (a.length < 80 && b.length < 80 && !a.includes(' ') && !b.includes(' ')) {
        return (
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-red-500 line-through bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">{a}</span>
                <span className="text-gray-400">→</span>
                <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">{b}</span>
            </div>
        )
    }

    const wordsA = a.split(/(\s+)/)
    const wordsB = b.split(/(\s+)/)
    const segments = wordDiff(wordsA, wordsB)

    return (
        <div className="whitespace-pre-wrap break-words leading-relaxed">
            {segments.map((seg, i) => {
                if (seg.type === 'equal') return <span key={i} className="text-gray-500 dark:text-gray-400">{seg.text}</span>
                if (seg.type === 'removed') return <span key={i} className="text-red-500 line-through bg-red-50 dark:bg-red-900/20 rounded px-0.5">{seg.text}</span>
                return <span key={i} className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-0.5">{seg.text}</span>
            })}
        </div>
    )
}

function wordDiff(a: string[], b: string[]): { type: 'equal' | 'removed' | 'added'; text: string }[] {
    const m = a.length, n = b.length
    const dp: number[][] = Array.from({length: m + 1}, () => Array(n + 1).fill(0))
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])

    const result: { type: 'equal' | 'removed' | 'added'; text: string }[] = []
    let i = m, j = n
    const stack: typeof result = []
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            stack.push({type: 'equal', text: a[i - 1]})
            i--; j--
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            stack.push({type: 'added', text: b[j - 1]})
            j--
        } else {
            stack.push({type: 'removed', text: a[i - 1]})
            i--
        }
    }
    stack.reverse()

    for (const seg of stack) {
        if (result.length > 0 && result[result.length - 1].type === seg.type) {
            result[result.length - 1].text += seg.text
        } else {
            result.push({...seg})
        }
    }
    return result
}

