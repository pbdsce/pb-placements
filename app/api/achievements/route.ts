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
      return NextResponse.json(
        { success: false, error: 'Invalid payload: member_id and achievements array required.' },
        { status: 400 }
      );
    }

    for (const title of achievements) {
      const { error } = await supabase.from('achievements').insert({
        id: uuidv4(),
        member_id,
        title,
      });
      if (error) {
        return NextResponse.json(
          { success: false, error: `Failed to insert achievement: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: 'Achievements inserted successfully.' },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}