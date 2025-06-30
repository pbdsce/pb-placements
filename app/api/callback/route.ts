// app/api/auth/callback/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies }); 

  const { event, session } = await req.json();
  await supabase.auth.setSession(session); 

  return NextResponse.json({ status: 'success' });
}
