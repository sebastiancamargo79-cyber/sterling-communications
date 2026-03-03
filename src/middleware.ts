import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const auth = request.cookies.get('sc_auth')?.value
  const password = process.env.SITE_PASSWORD

  if (!password || auth !== password) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.search = `?from=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
