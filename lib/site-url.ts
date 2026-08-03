import type { NextRequest } from 'next/server';

const knownOrigins: Record<string, string> = {
  'careers.pointblank.club': 'https://careers.pointblank.club',
  'staging-careers.pointblank.club': 'https://staging-careers.pointblank.club',
  'localhost:3000': 'http://localhost:3000',
  '127.0.0.1:3000': 'http://127.0.0.1:3000',
};

/** Resolve the public app URL for the host that handled this request. */
export function getSiteOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get('x-forwarded-host');
  const requestHost = (forwardedHost || req.headers.get('host') || req.nextUrl.host)
    .split(',')[0]
    .trim()
    .toLowerCase();

  return (
    knownOrigins[requestHost] ||
    process.env.NEXT_PUBLIC_DOMAIN ||
    'https://careers.pointblank.club'
  ).replace(/\/$/, '');
}
