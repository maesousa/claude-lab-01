export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Reports</h1>
      <p className="text-gray-500 text-sm">
        Cost reports by employee, cost centre, direção, and pelouro · Coming next
      </p>
      <div className="mt-6 space-y-2 text-sm text-amber-700">
        <div className="inline-block bg-amber-50 border border-amber-200 rounded px-3 py-2 block w-fit">
          <code className="font-mono">/api/relatorios/colaborador?year=2026</code>
        </div>
        <div className="inline-block bg-amber-50 border border-amber-200 rounded px-3 py-2 block w-fit">
          <code className="font-mono">/api/relatorios/area?year=2026</code>
        </div>
        <div className="inline-block bg-amber-50 border border-amber-200 rounded px-3 py-2 block w-fit">
          <code className="font-mono">/api/relatorios/direcao?year=2026</code>
        </div>
        <div className="inline-block bg-amber-50 border border-amber-200 rounded px-3 py-2 block w-fit">
          <code className="font-mono">/api/relatorios/pelouro?year=2026</code>
        </div>
      </div>
    </div>
  )
}
