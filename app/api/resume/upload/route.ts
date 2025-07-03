import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { extractTextFromPDF, analyzeWithGemini } from '@/lib/resume-parser';
import { Buffer } from 'buffer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (!user || authError) {
      console.error('Auth error:', authError?.message);
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const resumeFile = formData.get('resume') as File;

    if (!resumeFile) {
      return NextResponse.json({ success: false, message: 'No resume file provided' }, { status: 400 });
    }

    if (resumeFile.type !== 'application/pdf') {
      return NextResponse.json({ success: false, message: 'Only PDF files are supported' }, { status: 400 });
    }

    if (resumeFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    const fileBuffer = await resumeFile.arrayBuffer();
    
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
      return NextResponse.json({ success: false, message: 'Failed to upload to Supabase' }, { status: 500 });
    }

    const publicResumeUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resume/${data.path}`;

    const extractedText = await extractTextFromPDF(fileBuffer);
    const parsedData = await analyzeWithGemini(extractedText);

    parsedData.resume_url = publicResumeUrl;
    parsedData.resume_filename = `${username}_${timestamp}.pdf`;

    return NextResponse.json({
      success: true,
<<<<<<< HEAD
      id: uuidv4(),
=======
      message: 'Resume uploaded and parsed successfully.',
      id: uploadId,
>>>>>>> 53e2a0e (Added proper error logging messages and status codes)
      file_path: data.path,
      ...parsedData,
    });

  } catch (error) {
    console.error('Error processing resume:', error);
    return NextResponse.json({ success: false, message: 'Failed to process resume' }, { status: 500 });
  }
}