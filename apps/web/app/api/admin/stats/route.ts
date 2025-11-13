import { NextRequest, NextResponse } from 'next/server'

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8787'

export async function GET() {
  const token = '' // stats are public in this simplified version; adjust if needed
  const resp = await fetch(new URL('/api/v1/admin/stats', API), {
    headers: token ? { 'x-admin-token': token } : {}
  })
  const data = await resp.json().catch(() => ({}))
  return NextResponse.json(data, { status: resp.status })
}