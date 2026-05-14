import { NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const needsAuth = pathname.startsWith("/admin") || pathname.startsWith("/activate")
  if (!needsAuth) return NextResponse.next()

  // Supabase sets a cookie named sb-<project-ref>-auth-token when logged in.
  // Checking for its presence blocks unauthenticated requests before any page HTML loads.
  // Role-level enforcement (admin vs student) is handled in admin/layout.tsx client-side.
  const hasSbCookie = request.cookies.getAll().some(
    c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  )

  if (!hasSbCookie) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/activate/:path*"],
}
