import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth/');
  const isBackupRoute = request.nextUrl.pathname === '/api/backup';

  // Auth rotaları için token kontrolü yapma
  if (isAuthRoute) {
    return NextResponse.next();
  }

  // Backup API için sadece API key kontrolü yap
  if (isBackupRoute) {
    const apiKey = request.headers.get('x-api-key');
    if (!process.env.BACKUP_API_KEY || apiKey !== process.env.BACKUP_API_KEY) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // API rotaları için token kontrolü
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Sayfa yönlendirmeleri için kontroller
  if (!token && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isLoginPage) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}; 