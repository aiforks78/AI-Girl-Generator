import { NextResponse } from 'next/server';

// Internationalization disabled: pass-through middleware
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
