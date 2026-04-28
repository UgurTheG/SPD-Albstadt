interface ToggleProps {
  id?: string
  value: boolean
  onChange: (v: boolean) => void
  /** Labels shown next to the track. Defaults to German "Aktiv" / "Inaktiv". */
  label?: { on: string; off: string }
}

/**
 * Accessible toggle switch — renders as a `<button>` so it works without a
 * wrapping `<label>`. The `id` prop wires it to a `<label htmlFor>` in the
 * parent when needed (e.g. inside FieldRenderer).
 */
export default function Toggle({
  id,
  value,
  onChange,
  label = { on: 'Aktiv', off: 'Inaktiv' },
}: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      className="flex items-center gap-3 group"
      onClick={() => onChange(!value)}
    >
      <div
        className={`w-12 h-7 rounded-full relative transition-all duration-300 ${
          value
            ? 'bg-linear-to-r from-spd-red to-spd-red-dark shadow-sm shadow-spd-red/25'
            : 'bg-gray-200 dark:bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
            value ? 'translate-x-5' : ''
          }`}
        />
      </div>
      <span
        className={`text-sm font-medium transition-colors ${
          value ? 'text-spd-red dark:text-red-400' : 'text-gray-400'
        }`}
      >
        {value ? label.on : label.off}
      </span>
    </button>
  )
}
