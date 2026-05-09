import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {  
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/portal/admin', '/portal/farmer', '/portal/processor', '/portal/logistics'];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  // Vào trang bảo vệ mà không có token → về login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Đã có token mà vào /login → về traceability
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/traceability', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/portal/admin/:path*',
    '/portal/farmer/:path*',
    '/portal/processor/:path*',
    '/portal/logistics/:path*',
    '/login',
  ],
};