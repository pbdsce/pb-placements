import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('Received member data:', data); // Debug log
    
    const member = await MemberService.upsertMember({
      id: data.id,
      name: data.name,
      email: data.email,
      domain: data.domain,
      year_of_study: data.year_of_study,
      picture_url: data.picture_url || '',
      resume_url: data.resume_url || '',
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    console.log('Upserted member:', member); // Debug log

    return NextResponse.json({
      success: true,
      message: 'Member upserted successfully.',
      member,
    });
  } catch (error) {
    console.error('Error upserting member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upsert member.' },
      { status: 500 }
    );
  }
} 