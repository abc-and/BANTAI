// middleware.ts (at project root)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname
  const pathname = request.nextUrl.pathname
  
  // Get token from cookies (since your AuthContext uses localStorage)
  // Note: localStorage is not available in middleware, so you'll need to use cookies
  const token = request.cookies.get('token')?.value
  
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/api/auth/login']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  
  // If not authenticated and trying to access protected route
  if (!token && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // For API routes, add user info to headers if token exists
  if (token && pathname.startsWith('/api/')) {
    // You can decode the token here and add user info to headers
    // This is optional but useful for API routes
    const requestHeaders = new Headers(request.headers)
    
    // Example: decode token (customize based on your token format)
    try {
      // If your token contains user info, decode it here
      // const userInfo = decodeToken(token)
      // requestHeaders.set('X-User-Id', userInfo.id)
      // requestHeaders.set('X-User-Role', userInfo.role)
      // requestHeaders.set('X-User-Operator-Id', userInfo.operatorId || '')
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch {
      // Invalid token, continue without headers
    }
  }
  
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}