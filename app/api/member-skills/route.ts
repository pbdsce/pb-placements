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
      return NextResponse.json(
        { success: false, error: 'Invalid payload: member_id and skills are required.' },
        { status: 400 }
      );
    }
    for (const skillName of skills) {
      // Upsert skill
      const { data: skillData, error: skillError } = await supabase
        .from('skills')
        .upsert([{ name: skillName }], { onConflict: 'name' })
        .select();
      if (skillError) {
        console.error('Error upserting skill:', skillError);
        return NextResponse.json(
          { success: false, error: `Failed to upsert skill: ${skillError.message}` },
          { status: 500 }
        );
      }
      const skill = Array.isArray(skillData) ? skillData[0] : skillData;
      // Insert into member_skills
      await supabase.from('member_skills').upsert({
        member_id,
        skill_id: skill.id,
      });
    }
    return NextResponse.json(
      { success: true, message: 'Skills updated successfully.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Unexpected error in member-skills:', error);
    return NextResponse.json(
      { success: false, error: 'Unexpected server error.' },
      { status: 500 }
    );
  }
} 