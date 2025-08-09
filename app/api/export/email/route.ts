import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import { memberUrl } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const {
      memberId,
      memberName,
      memberEmail,
    }: {
      memberId: string;
      memberName: string;
      memberEmail: string;
    } = await req.json();

    // Basic field validation
    if (!memberId || !memberName || !memberEmail) {
      console.warn('[GMAIL_TEMPLATE] Missing required fields:', {
        memberId,
        memberName,
        memberEmail,
      });
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const member = await MemberService.getMemberById(supabase, memberId);

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          message: 'Member not found',
        },
        { status: 404 }
      );
    }

    if (!member.resume_url) {
      return NextResponse.json(
        {
          success: false,
          message: 'Resume not found for this member',
        },
        { status: 404 }
      );
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_DOMAIN || 'https://careers.pointblank.club').replace(/\/$/, '');
    const profileUrl = memberUrl(member.name, member.id, 'profile', siteUrl);
    const resumeUrl = memberUrl(member.name, member.id, 'resume', siteUrl);
    const subject = `Recommendation: ${memberName} from Point Blank`;

    const body = `
Hi,

I hope this message finds you well.

I'm writing to recommend ${memberName}, a talented and driven junior from our tech community Point Blank. I've had the chance to work closely with them and can confidently vouch for their technical depth, eagerness to learn, and strong work ethic.

You can find their full profile here: ${profileUrl}

You can download their resume directly from here: ${resumeUrl}

Please feel free to reach out if you'd like more details or want to connect with them directly.

Best regards,  
[Your Name]
`;

    const gmailDraftURL = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=&su=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    return NextResponse.json({
      success: true,
      gmailDraftURL,
      resumeUrl,
    });
  } catch (error: any) {
    console.error('[GMAIL_TEMPLATE] Server error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server error while generating Gmail draft',
      },
      { status: 500 }
    );
  }
}
