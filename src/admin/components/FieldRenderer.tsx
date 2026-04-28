import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { FieldConfig } from '../types'
import { isoToDE, deToISO } from '../../utils/formatDate'
import ImageField from '../fields/ImageField'
import ImageListField from '../fields/ImageListField'
import IconPickerField from '../fields/IconPickerField'
import { FieldIcon } from '../lib/socialIcons'
import { inputCls } from '../lib/inputCls'
import Toggle from '../../components/Toggle'

// ─── Public API ────────────────────────────────────────────────────────────────

interface Props {
  field: FieldConfig
  value: unknown
  onChange: (v: unknown, extras?: Record<string, unknown>) => void
  contextItem?: Record<string, unknown>
}

// Field types that produce a single focusable element — these get a <label htmlFor>.
// Multi-input types (stringlist, imagelist) and non-input types (toggle, image)
// get a <span> so the label is never orphaned.
const LABEL_TYPES = new Set([
  'text',
  'email',
  'url',
  'date',
  'time',
  'select',
  'textarea',
  'icon-picker',
])

const labelCls =
  'block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider'

export default function FieldRenderer({ field, value, onChange, contextItem }: Props) {
  const inputId = useId()
  const labelText = field.label + (field.required ? ' *' : '')

  return (
    <div className="mb-4">
      {LABEL_TYPES.has(field.type) ? (
        <label htmlFor={inputId} className={labelCls}>
          {labelText}
        </label>
      ) : (
        <span className={labelCls}>{labelText}</span>
      )}
      <FieldInput
        inputId={inputId}
        field={field}
        value={value}
        onChange={onChange}
        contextItem={contextItem}
      />
    </div>
  )
}

// ─── Field dispatcher ──────────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  contextItem,
  inputId,
}: Props & { inputId?: string }) {
  switch (field.type) {
    case 'textarea':
      return (
        <TextareaField
          id={inputId}
          value={value as string}
          placeholder={field.placeholder}
          onChange={v => onChange(v)}
        />
      )
    case 'select':
      return (
        <SelectField
          id={inputId}
          value={value as string}
          options={field.options || []}
          onChange={v => onChange(v)}
        />
      )
    case 'image':
      return (
        <ImageField
          field={field}
          value={value as string}
          onChange={v => onChange(v)}
          contextItem={contextItem}
        />
      )
    case 'imagelist':
      return (
        <ImageListField
          field={field}
          value={value as string[]}
          onChange={(v, extras) => onChange(v, extras)}
          contextItem={contextItem}
        />
      )
    case 'stringlist':
      return <StringListField value={value as string[]} onChange={v => onChange(v)} />
    case 'icon-picker':
      return <IconPickerField id={inputId} value={value as string} onChange={v => onChange(v)} />
    case 'date':
      return <DateField id={inputId} value={value as string} onChange={v => onChange(v)} />
    case 'time':
      return <TimeField id={inputId} value={value as string} onChange={v => onChange(v)} />
    case 'toggle':
      return <Toggle id={inputId} value={value as boolean} onChange={v => onChange(v)} />
    default:
      return (
        <div className="flex items-center gap-2.5 bg-white/60 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-spd-red/20 focus-within:border-spd-red/40 focus-within:bg-white dark:focus-within:bg-gray-800/80 transition-all duration-200 backdrop-blur-sm">
          {field.iconKey && (
            <span className="text-gray-400 dark:text-gray-500 shrink-0 flex items-center">
              <FieldIcon iconKey={field.iconKey} />
            </span>
          )}
          <input
            id={inputId}
            type={field.type || 'text'}
            className="w-full min-w-0 bg-transparent text-sm focus:outline-none dark:text-white dark:placeholder-gray-500"
            value={(value as string) || ''}
            placeholder={field.placeholder}
            onChange={e => onChange(e.target.value)}
            spellCheck={field.type === 'email' || field.type === 'url' ? false : undefined}
            autoCapitalize={field.type === 'email' || field.type === 'url' ? 'off' : undefined}
            autoCorrect={field.type === 'email' || field.type === 'url' ? 'off' : undefined}
          />
        </div>
      )
  }
}

// ─── Simple inline field components ───────────────────────────────────────────

function TextareaField({
  id,
  value,
  placeholder,
  onChange,
}: {
  id?: string
  value: string
  placeholder?: string
  onChange: (v: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const resize = useCallback(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.max(80, ref.current.scrollHeight) + 'px'
    }
  }, [])
  useEffect(() => {
    resize()
  }, [value, resize])
  return (
    <textarea
      ref={ref}
      id={id}
      className={inputCls + ' resize-y min-h-20'}
      rows={3}
      value={value || ''}
      onChange={e => {
        onChange(e.target.value)
        resize()
      }}
      placeholder={placeholder ?? 'Text eingeben…'}
    />
  )
}

function SelectField({
  id,
  value,
  options,
  onChange,
}: {
  id?: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <select
      id={id}
      className={inputCls + ' cursor-pointer'}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">— Bitte wählen —</option>
      {options.map(o => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function DateField({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
}) {
  // isoToDE / deToISO live in src/utils/formatDate.ts — shared with the public app
  const [display, setDisplay] = useState(isoToDE(value))
  const [valid, setValid] = useState(true)
  // Track the previous value as state so we can reset the display string when
  // value changes externally (undo / redo / revert) without accessing a ref during render.
  const [prevValue, setPrevValue] = useState(value)
  if (prevValue !== value) {
    setPrevValue(value)
    setDisplay(isoToDE(value))
    setValid(true)
  }

  const hint = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <input
        id={id}
        type="text"
        className={`${inputCls} max-w-40 ${!valid ? 'text-spd-red' : ''}`}
        placeholder="TT.MM.JJJJ"
        value={display}
        onChange={e => {
          setDisplay(e.target.value)
          const iso = deToISO(e.target.value)
          if (iso) {
            onChange(iso)
            setValid(true)
          } else if (e.target.value === '') {
            onChange('')
            setValid(true)
          } else setValid(false)
        }}
      />
      {hint && <span className="text-sm text-gray-500 dark:text-gray-400">{hint}</span>}
    </div>
  )
}

function TimeField({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="text"
        className={`${inputCls} max-w-25`}
        placeholder="HH:MM"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Uhr</span>
    </div>
  )
}

function StringListField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const list = Array.isArray(value) ? value : []
  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={`${i}-${item}`} className="flex gap-2 group">
          <input
            type="text"
            className={inputCls + ' flex-1'}
            value={item}
            onChange={e => {
              const n = [...list]
              n[i] = e.target.value
              onChange(n)
            }}
          />
          <button
            type="button"
            className="text-xs text-gray-300 group-hover:text-red-400 hover:text-red-600! px-2 rounded-lg transition-colors"
            onClick={() => {
              const n = [...list]
              n.splice(i, 1)
              onChange(n)
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-spd-red font-semibold hover:underline flex items-center gap-1.5 mt-1"
        onClick={() => onChange([...list, ''])}
      >
        <Plus size={12} /> Hinzufügen
      </button>
    </div>
  )
}
