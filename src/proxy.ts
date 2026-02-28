import { NextResponse, type NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('payload-token')?.value

  // Public paths that don't need auth
  const isLoginPath = pathname === '/login'
  const isPublicPath = isLoginPath

  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (token && isLoginPath) {
    return NextResponse.redirect(new URL('/projects', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon|icon|admin|media|api).*)'],
}
