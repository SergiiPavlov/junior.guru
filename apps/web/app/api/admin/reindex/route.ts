import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787/api/v1'

export async function POST(req: NextRequest) {
  const { type } = await req.json().catch(() => ({ type: 'jobs' }))
  const token = req.cookies.get('admin-token')?.value || ''
  const url = type === 'events' ? '/events/reindex' : '/jobs/reindex'
  const resp = await fetch(new URL(url, API), {
    method: 'POST',
    headers: { 'x-admin-token': token }
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json({ status: resp.status, data })
}