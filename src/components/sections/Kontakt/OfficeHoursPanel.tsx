export function OfficeHoursPanel({
  buerozeiten,
}: {
  buerozeiten: { tage: string; zeit: string }[]
}) {
  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
      <h4 className="text-gray-900 dark:text-white font-bold mb-3">Bürozeiten</h4>
      <div className="space-y-2 text-sm">
        {buerozeiten.map((b, index) => (
          <div key={index} className="flex justify-between">
            <span className="text-gray-500 dark:text-white/60">{b.tage}</span>
            <span className="text-gray-900 dark:text-white font-medium">{b.zeit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
