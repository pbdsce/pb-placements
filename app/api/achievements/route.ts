import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { member_id, achievements } = await request.json();
    if (!member_id || !Array.isArray(achievements)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }
    for (const title of achievements) {
      await supabase.from('achievements').insert({
        id: uuidv4(),
        member_id,
        title,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 