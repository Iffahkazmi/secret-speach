import { auth } from '@/lib/auth'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isAuthPage = pathname.startsWith('/auth')
  const isApiRoute = pathname.startsWith('/api')
  const isLandingPage = pathname === '/'

  if (isApiRoute) return
  if (isLandingPage) return

  if (!isLoggedIn && !isAuthPage) {
    return Response.redirect(new URL('/', req.url))
  }

  if (isLoggedIn && isAuthPage) {
    return Response.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}