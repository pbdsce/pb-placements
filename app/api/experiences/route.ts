import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { member_id, experiences } = await request.json();
    
    if (!member_id || !Array.isArray(experiences)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }

    // Delete existing experiences for this member
    await supabase
      .from('experiences')
      .delete()
      .eq('member_id', member_id);

    // Insert new experiences
    for (const exp of experiences) {
      await supabase.from('experiences').insert({
        id: uuidv4(),
        member_id,
        company: exp.company,
        role: exp.role,
        description: exp.description,
        start_date: exp.start_date,
        end_date: exp.end_date,
        is_current: exp.is_current,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving experiences:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 