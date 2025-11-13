import { cookies } from 'next/headers'

async function getStats() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/admin/stats`, { cache: 'no-store' })
    return res.ok ? await res.json() : null
  } catch { return null }
}

export default async function AdminPage() {
  const token = cookies().get('admin_token')?.value
  const stats = await getStats()

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {!token && (
        <form className="space-y-2" action="/api/admin/login" method="post" onSubmit={(e)=>{
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const token = (form.querySelector('input[name=token]') as HTMLInputElement).value;
          fetch('/api/admin/login', { method:'POST', body: JSON.stringify({ token })})
            .then(()=> location.reload());
        }}>
          <label className="block text-sm">Token</label>
          <input name="token" type="password" className="border px-3 py-2 rounded w-full" />
          <button className="mt-2 px-4 py-2 rounded bg-black text-white">Login</button>
        </form>
      )}

      {token && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={async()=>{
              const r = await fetch('/api/admin/reindex', { method:'POST', body: JSON.stringify({ type:'jobs' }) })
              alert('Jobs reindex: ' + r.status)
            }}>Reindex Jobs</button>
            <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={async()=>{
              const r = await fetch('/api/admin/reindex', { method:'POST', body: JSON.stringify({ type:'events' }) })
              alert('Events reindex: ' + r.status)
            }}>Reindex Events</button>
          </div>

          <div className="rounded border p-3">
            <h2 className="font-medium mb-2">Indexes</h2>
            <pre className="text-sm bg-gray-50 p-2 rounded">{JSON.stringify(stats, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}