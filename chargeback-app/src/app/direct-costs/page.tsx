export default function DirectCostsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Direct Costs</h1>
      <p className="text-gray-500 text-sm">
        Fixed annual costs charged directly to a cost centre · Coming next
      </p>
      <div className="mt-6 inline-block bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded px-3 py-2">
        API ready at <code className="font-mono">/api/direct-costs?year=2026</code>
      </div>
    </div>
  )
}
