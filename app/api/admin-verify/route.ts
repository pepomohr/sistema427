import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD no configurado en Vercel' }, { status: 500 })
  }

  if (password === adminPassword) {
    return NextResponse.json({ ok: true })
  } else {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}
