import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787'

export async function POST(req: NextRequest) {
  const { type } = await req.json().catch(() => ({ type: 'jobs' }))
  const token = req.cookies.get('admin_token')?.value || ''
  const url = type === 'events' ? '/api/v1/admin/reindex/events' : '/api/v1/admin/reindex/jobs'
  const resp = await fetch(new URL(url, API), {
    method: 'POST',
    headers: { 'x-admin-token': token }
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json({ status: resp.status, data })
}