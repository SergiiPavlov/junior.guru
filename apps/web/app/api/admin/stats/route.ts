import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787/api/v1'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin-token')?.value || ''
  const headers: Record<string, string> = {}
  if (token) {
    headers['x-admin-token'] = token
  }
  const resp = await fetch(new URL('/admin/stats', API), {
    headers
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}