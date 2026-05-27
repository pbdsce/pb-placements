import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { memberId, memberName } = await req.json();

    if (!memberId || !memberName) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields',
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const member = await MemberService.getMemberById(supabase, memberId);

    if (!member || !member.resume_url) {
      return NextResponse.json({
        success: false,
        message: 'Resume URL not found',
      }, { status: 404 });
    }

    const proxyUrl = `/api/resume/view/${memberId}`;

    return NextResponse.json({
      success: true,
      resumeUrl: proxyUrl,
      filename: `${memberName.replace(/\s+/g, '-').toLowerCase()}-resume.pdf`,
    });

  } catch (error) {
    console.error('[RESUME_DOWNLOAD]', error);
    return NextResponse.json({
      success: false,
      message: 'Server error',
    }, { status: 500 });
  }
}
