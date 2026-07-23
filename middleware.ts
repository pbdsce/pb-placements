import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedOrigins = ['http://localhost:3000', 'https://careers.pointblank.club'];

function addCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith('/api/') && req.method === 'OPTIONS') {
    return addCors(req, new NextResponse(null, { status: 204 }));
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalidates the token with the auth server (don't trust getSession
  // in middleware) and refreshes cookies via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedRoutes = [
    '/api/profile/update',
    '/api/resume',
    '/api/members',
    '/api/experiences',
    '/api/achievements',
    '/api/links',
    '/api/member-skills',
  ];

  // Carry any refreshed auth cookies onto a redirect response.
  const withAuthCookies = (redirect: NextResponse) => {
    res.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const getResponse = () => {
    if (pathname.startsWith('/api/resume/view')) {
      return res;
    }

    const isProtected = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isProtected && !user) {
      const redirectUrl = new URL('/auth/email-link-sign-in', req.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return withAuthCookies(NextResponse.redirect(redirectUrl));
    }

    if (pathname.startsWith('/auth') && user) {
      return withAuthCookies(NextResponse.redirect(new URL('/', req.url)));
    }

    return res;
  };

  const response = getResponse();
  return pathname.startsWith('/api/') ? addCors(req, response) : response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|public|api/public).*)',
  ],
};
