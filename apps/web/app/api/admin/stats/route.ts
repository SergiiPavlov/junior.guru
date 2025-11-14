import { NextRequest, NextResponse } from 'next/server'

import { buildApiUrl } from '../../../../lib/api'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin-token')?.value || ''
  const headers: Record<string, string> = {}
  if (token) {
    headers['x-admin-token'] = token
  }
  const resp = await fetch(buildApiUrl('admin/stats'), {
    headers
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}