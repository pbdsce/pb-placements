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

    // First, delete all existing skills for the member
    const { error: deleteError } = await supabase
      .from('member_skills')
      .delete()
      .eq('member_id', member_id);

    if (deleteError) {
      console.error('Error deleting old skills:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    if (skills.length === 0) {
      // If skills array is empty, we're done after deleting.
      return NextResponse.json({ success: true });
    }
    
    // Then, insert the new skills
    const newSkills = [];
    for (const skillName of skills) {
      // Upsert skill to ensure it exists in the skills table
      const { data: skillData, error: skillError } = await supabase
        .from('skills')
        .upsert({ name: skillName.trim() }, { onConflict: 'name', ignoreDuplicates: false })
        .select('id')
        .single();
        
      if (skillError) {
        console.error('Error upserting skill:', skillError);
        // Continue to next skill if one fails, or return error
        continue; 
      }
      
      if (skillData) {
        newSkills.push({
          member_id,
          skill_id: skillData.id,
        });
      }
    }

    if (newSkills.length > 0) {
      // Insert all new skills for the member
      const { error: insertError } = await supabase
        .from('member_skills')
        .insert(newSkills);

      if (insertError) {
        console.error('Error inserting new skills:', insertError);
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing member skills:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 