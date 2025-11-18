import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques qui ne nécessitent pas d'authentification
  const publicPaths = ['/', '/login', '/signup', '/forgot-password'];

  // Vérifier si la route actuelle est publique
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith('/api/'));

  // Si c'est une route publique, laisser passer
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Pour les routes protégées, vérifier si le token existe
  // Note: Dans un vrai système, vous devriez vérifier la validité du token
  // Ici on fait juste une vérification basique côté client

  return NextResponse.next();
}

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
};
