import { NextRequest, NextResponse } from 'next/server';
import { SkillService } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const skills = await SkillService.getMemberSkills(params.id);
    return NextResponse.json(skills);
  } catch (error) {
    console.error('Error fetching member skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member skills' },
      { status: 500 }
    );
  }
} 