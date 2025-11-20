export default function Loading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 w-2/3 bg-gray-200 rounded" />
      <div className="h-5 w-1/3 bg-gray-200 rounded" />
      <div className="h-64 w-full bg-gray-100 rounded" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-full bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}
