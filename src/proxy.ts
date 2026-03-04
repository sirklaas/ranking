import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const hostname = request.headers.get('host') || '';
    const { pathname } = request.nextUrl;

    // 1. Handle "masked.pinkmilk.eu" -> Rewrite to /me
    if (hostname.startsWith('masked.')) {
        // If the path is already /me, don't rewrite to avoid loops (though usually fine)
        if (!pathname.startsWith('/me')) {
            return NextResponse.rewrite(new URL(`/me${pathname}`, request.url));
        }
    }

    // 2. Handle "ranking.pinkmilk.eu" (or others) -> Keep as is (Root)
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - assets (public assets)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
    ],
};
