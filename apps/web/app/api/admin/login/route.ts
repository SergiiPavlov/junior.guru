import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: '' }))
  if (!token) return NextResponse.json({ ok: false }, { status: 400 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_token', token, { httpOnly: true, path: '/', sameSite: 'lax' })
  return res
}