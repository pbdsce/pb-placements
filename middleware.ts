import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedOrigins = [
  'http://localhost:3000',
  'https://careers.pointblank.club',
  'https://staging-careers.pointblank.club',
];

const protectedRoutes = [
  '/api/profile/update',
  '/api/profile/delete',
  '/api/resume',
  '/api/members',
  '/api/experiences',
  '/api/achievements',
  '/api/links',
  '/api/member-skills',
];

const bearerValidatedRoutes = [
  '/api/profile/update',
  '/api/resume/upload',
  '/api/members',
];

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

  const isResumeView = pathname.startsWith('/api/resume/view');
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const validatesBearerToken = bearerValidatedRoutes.some((route) => pathname.startsWith(route));
  const hasBearerToken = req.headers.get('authorization')?.startsWith('Bearer ') ?? false;

  // Public pages, including the sign-in page, do not need server-side auth
  // refresh. Avoid emitting chunked Supabase session cookies on cacheable page
  // responses, which can exceed the proxy response-header buffer. The sign-in
  // page already redirects authenticated users from the browser auth store.
  const shouldCheckAuth =
    !isResumeView &&
    isProtected && !(validatesBearerToken && hasBearerToken);

  if (!shouldCheckAuth) {
    const response = NextResponse.next({ request: req });
    return pathname.startsWith('/api/') ? addCors(req, response) : response;
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: 'raw',
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Supabase may write refreshed auth cookies here. These responses must not
  // be cached by Next.js, Cloudflare, or another proxy.
  res.headers.set('Cache-Control', 'private, no-store');

  const withAuthCookies = (redirect: NextResponse) => {
    res.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set('Cache-Control', 'private, no-store');
    return redirect;
  };

  if (isProtected && !user) {
    const redirectUrl = new URL('/auth/email-link-sign-in', req.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return addCors(req, withAuthCookies(NextResponse.redirect(redirectUrl)));
  }

  return pathname.startsWith('/api/') ? addCors(req, res) : res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|public|api/public).*)',
  ],
};
