import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

async function getMemberAndUrl(memberId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const member = await MemberService.getMemberById(supabase, memberId);
  const resumeUrl = member?.resume_url;
  return { member, resumeUrl };
}

export async function HEAD(_req: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const { memberId } = params;
    if (!memberId) return new NextResponse(null, { status: 400 });

    const { resumeUrl } = await getMemberAndUrl(memberId);
    if (!resumeUrl) return new NextResponse(null, { status: 404 });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const { memberId } = params;
    if (!memberId) {
      return NextResponse.json({ message: 'memberId is required' }, { status: 400 });
    }

    const { member, resumeUrl } = await getMemberAndUrl(memberId);
    if (!member || !resumeUrl) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    const upstream = await fetch(resumeUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ message: 'Failed to load resume' }, { status: 502 });
    }

    let filename = 'resume.pdf';
    try {
      const url = new URL(resumeUrl);
      const pathParts = url.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.pdf')) {
        filename = lastPart;
      } else {
        filename = `${member.name || 'resume'}.pdf`;
      }
    } catch {
      filename = `${member.name || 'resume'}.pdf`;
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${filename}"`);
    headers.set('Cache-Control', 'private, max-age=60');

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error('[RESUME_PROXY_ERROR]', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}