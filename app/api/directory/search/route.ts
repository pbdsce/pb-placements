import { NextRequest, NextResponse } from 'next/server';
import { MemberService } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

// Helper function to convert year string to number
const convertYearToNumber = (year: string): number => {
  if (year === '1st') return 1;
  if (year === '2nd') return 2;
  if (year === '3rd') return 3;
  if (year === '4th') return 4;
  return 5; // Alumni
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract and sanitize query params
    const search = searchParams.get('search')?.trim() || '';
    const domains = searchParams.getAll('domain').filter(Boolean);
    const years = searchParams
      .getAll('year')
      .map(year => {
        // Try to parse as number first
        const numYear = Number(year);
        if (!isNaN(numYear)) return numYear;
        // If not a number, convert from string format
        return convertYearToNumber(year);
      })
      .filter((y) => !isNaN(y));
    const skills = searchParams.getAll('skills').filter(Boolean);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    // Fetch filtered members
    const results = await MemberService.searchMembers(supabase, search, domains, years, skills);

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Error searching directory:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to search directory',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
