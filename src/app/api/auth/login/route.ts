import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string }
  const sitePassword = process.env.SITE_PASSWORD

  if (!sitePassword || password !== sitePassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const from = req.nextUrl.searchParams.get('from') || '/'

  const res = NextResponse.json({ ok: true, redirect: from })
  res.cookies.set('sc_auth', sitePassword, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })
  return res
}
