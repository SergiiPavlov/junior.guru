import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.warn('[CSP-Report]', JSON.stringify(body).slice(0, 2000));
  } catch {}
  return NextResponse.json({ ok: true });
}