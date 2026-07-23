import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_FILENAME_RE = /^[\w\-\.]+\.pdf$/;

async function getMemberAndUrl(memberId: string, filename?: string | null) {
  if (!UUID_RE.test(memberId)) {
    return { member: null, resumeUrl: null, invalidMemberId: true };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const member = await MemberService.getMemberById(supabase, memberId);
  let resumeUrl = member?.resume_url;

  if (filename) {
    // Strict filename validation: only word chars, hyphens, dots + .pdf extension (no double dots)
    if (SAFE_FILENAME_RE.test(filename) && !filename.includes('..')) {
      const userFolder = `resumes/${memberId}`;
      const { data } = supabase.storage
        .from('resume')
        .getPublicUrl(`${userFolder}/${filename}`);
      if (data?.publicUrl) {
        resumeUrl = data.publicUrl;
      }
    }
  }

  return { member, resumeUrl };
}

export async function HEAD(req: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const { memberId } = params;
    if (!memberId) return new NextResponse(null, { status: 400 });

    const searchParams = req.nextUrl.searchParams;
    const filename = searchParams.get('filename');

    const result = await getMemberAndUrl(memberId, filename);
    if (result.invalidMemberId) return new NextResponse(null, { status: 400 });
    if (!result.resumeUrl) return new NextResponse(null, { status: 404 });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const { memberId } = params;
    if (!memberId) {
      return NextResponse.json({ message: 'memberId is required' }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const filename = searchParams.get('filename');

    const result = await getMemberAndUrl(memberId, filename);
    if (result.invalidMemberId) {
      return NextResponse.json({ message: 'Invalid memberId' }, { status: 400 });
    }
    if (!result.member || !result.resumeUrl) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }
    const { member, resumeUrl } = result;

    const upstream = await fetch(resumeUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ message: 'Failed to load resume' }, { status: 502 });
    }

    let displayFilename = 'resume.pdf';
    try {
      const url = new URL(resumeUrl);
      const pathParts = url.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes('.pdf')) {
        displayFilename = lastPart;
      } else {
        displayFilename = `${member.name || 'resume'}.pdf`;
      }
    } catch {
      displayFilename = `${member.name || 'resume'}.pdf`;
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${displayFilename}"`);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error('[RESUME_PROXY_ERROR]', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}