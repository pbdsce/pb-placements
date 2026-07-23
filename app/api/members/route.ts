import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/lib/db';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getAuthenticatedUser = async (
  req: NextRequest
): Promise<{ supabase: SupabaseClient; user: any } | null> => {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { supabase, user };
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { supabase, user } = auth;

    const data = await request.json();
    console.log('Received member data:', data); // Debug log

    if (user.id !== data.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const member = await MemberService.upsertMember(supabase, {
      id: data.id,
      name: data.name,
      email: data.email,
      domain: data.domain,
      year_of_study: data.year_of_study,
      picture_url: data.picture_url || '',
      resume_url: data.resume_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    console.log('Upserted member:', member); // Debug log
    
    return NextResponse.json({
      success: true,
      message: 'Member upserted successfully.',
      member,
    });
  } catch (error: any) {
    console.error('Error upserting member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upsert member.' },
      { status: 500 }
    );
  }
} 