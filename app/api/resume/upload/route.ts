import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromPDF, analyzeWithMistral } from '@/lib/resume-parser';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';

const createAuthenticatedClient = (token: string): SupabaseClient => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No token' }, { status: 401 });
    }

    const supabase = createAuthenticatedClient(token);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let fileBuffer: ArrayBuffer;
    let isReparse = false;
    let existingFilePath: string | null = null;

    if (contentType.includes('application/json')) {
      // Reparse mode
      isReparse = true;
      const body = await request.json();
      const { filePath } = body;

      if (!filePath) {
        return NextResponse.json({ success: false, message: 'No filePath provided' }, { status: 400 });
      }

      // Normalize path segments to prevent /../ traversal bypasses
      const normalisedPath = filePath
        .split('/')
        .reduce((acc: string[], seg: string) => {
          if (seg === '..') acc.pop();
          else if (seg !== '.') acc.push(seg);
          return acc;
        }, [] as string[])
        .join('/');

      const expectedPrefix = `resumes/${user.id}/`;
      if (!normalisedPath.startsWith(expectedPrefix)) {
        return NextResponse.json({ success: false, message: 'Unauthorized access to resume file' }, { status: 403 });
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resume')
        .download(normalisedPath);

      if (downloadError || !fileData) {
        console.error('Error downloading resume from Supabase Storage:', downloadError);
        return NextResponse.json({ success: false, message: 'Failed to download resume file' }, { status: 500 });
      }

      fileBuffer = await fileData.arrayBuffer();
      existingFilePath = normalisedPath;
    } else {
      // Upload mode
      const formData = await request.formData();
      const resumeFile = formData.get('resume') as File | null;

      if (!resumeFile) {
        return NextResponse.json({ success: false, message: 'No resume file provided' }, { status: 400 });
      }

      if (resumeFile.type !== 'application/pdf') {
        return NextResponse.json({ success: false, message: 'Only PDF files are supported' }, { status: 400 });
      }

      if (resumeFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'File size exceeds 5MB limit' }, { status: 400 });
      }

      fileBuffer = await resumeFile.arrayBuffer();
    }

    // Common PDF parsing for both modes
    const headerBytes = new Uint8Array(fileBuffer).slice(0, 5);
    const isPdf = Buffer.from(headerBytes).toString('ascii') === '%PDF-';
    if (!isPdf) {
      return NextResponse.json({ success: false, message: 'Invalid PDF file' }, { status: 400 });
    }
    let parsedData: any;
    try {
      const { text: extractedText, links: extractedLinks } = await extractTextFromPDF(fileBuffer);
      if (!extractedText?.trim()) {
        return NextResponse.json({ success: false, message: 'Could not extract text from PDF.' }, { status: 400 });
      }
      parsedData = await analyzeWithMistral(extractedText, extractedLinks);
      if (!parsedData?.name || !parsedData?.email) {
        return NextResponse.json({ success: false, message: 'Failed to parse key details from resume.' }, { status: 400 });
      }
    } catch (parseError) {
      console.error('Error parsing resume:', parseError);
      return NextResponse.json({ success: false, message: 'Failed to parse resume.' }, { status: 400 });
    }

    if (isReparse) {
      const publicResumeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resume/${existingFilePath}`;
      parsedData.resume_url = publicResumeUrl;

      return NextResponse.json({
        success: true,
        file_path: existingFilePath,
        ...parsedData,
      });
    }

    // Upload mode specific: Enforce limit and upload
    const username = user.user_metadata?.username || user.email?.split('@')[0] || user.id;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const userFolder = `resumes/${user.id}`;
    const fileName = `${userFolder}/${username}_${timestamp}.pdf`;

    const { data: existingFiles } = await supabase.storage
      .from('resume')
      .list(userFolder);

    if (existingFiles && existingFiles.length >= 4) {
      const sortedFiles = existingFiles.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      await supabase.storage
        .from('resume')
        .remove([`${userFolder}/${sortedFiles[0].name}`]);
    }

    const { error: uploadError, data } = await supabase.storage
      .from('resume')
      .upload(fileName, Buffer.from(fileBuffer), {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError || !data?.path) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json({ success: false, message: 'Failed to upload resume' }, { status: 500 });
    }

    const publicResumeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resume/${data.path}`;
    parsedData.resume_url = publicResumeUrl;

    return NextResponse.json({
      success: true,
      id: uuidv4(),
      file_path: data.path,
      ...parsedData,
    });

  } catch (error) {
    console.error('Error processing resume:', error);
    return NextResponse.json({ success: false, message: 'Failed to process resume' }, { status: 500 });
  }
}