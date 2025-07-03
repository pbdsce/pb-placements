import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const { member_id, skills } = await request.json();
    if (!member_id || !Array.isArray(skills)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }
    for (const skillName of skills) {
      // Upsert skill
      const { data: skillData, error: skillError } = await supabase
        .from('skills')
        .upsert([{ name: skillName }], { onConflict: 'name' })
        .select();
      if (skillError) {
        return NextResponse.json({ success: false, error: skillError.message }, { status: 500 });
      }
      const skill = Array.isArray(skillData) ? skillData[0] : skillData;
      // Insert into member_skills
      await supabase.from('member_skills').upsert({
        member_id,
        skill_id: skill.id,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 