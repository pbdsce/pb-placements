import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const experiences = await ExperienceService.getMemberExperiences(params.id);
    return NextResponse.json(experiences);
  } catch (error) {
    console.error('Error fetching member experiences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member experiences' },
      { status: 500 }
    );
  }
} 