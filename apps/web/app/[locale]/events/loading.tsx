export default function Loading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-1/3 bg-gray-200 rounded" />
      <div className="h-5 w-1/2 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded p-4 space-y-3">
            <div className="h-5 w-2/3 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-24 w-full bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
