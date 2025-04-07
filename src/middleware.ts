import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/about',
  '/contact',
];

// Check if the current route is public
const isPublicRoute = (path: string) => {
  return publicRoutes.some(route => path.startsWith(route));
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow public routes without authentication
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }

  // For protected routes, Firebase Authentication will handle the auth state client-side
  // This middleware will just ensure the route structure is maintained
  return NextResponse.next();
}

// Update the matcher to include all routes except public assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 