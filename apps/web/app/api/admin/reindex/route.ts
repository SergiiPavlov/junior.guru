import { NextRequest, NextResponse } from 'next/server'

import { buildApiUrl } from '../../../../lib/api'

export async function POST(req: NextRequest) {
  const { type } = await req.json().catch(() => ({ type: 'jobs' }))
  const token = req.cookies.get('admin-token')?.value || ''
  const url = type === 'events' ? 'events/reindex' : 'jobs/reindex'
  const resp = await fetch(buildApiUrl(url), {
    method: 'POST',
    headers: { 'x-admin-token': token }
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json({ status: resp.status, data })
}