import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function convertYearToString(year: number): string {
  if (year === 1) return '1st';
  if (year === 2) return '2nd';
  if (year === 3) return '3rd';
  if (year === 4) return '4th';
  return 'Alumni';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const domains = searchParams.getAll("domain");
    const years = searchParams.getAll("year");
    const skills = searchParams.getAll("skills");

    const yearMap: Record<string, number | string> = {
      "1st": 1,
      "2nd": 2,
      "3rd": 3,
      "4th": 4,
      "Alumni": "alumni",
    };

    const allMappedYears: (number | string)[] = years
      .map((y) => yearMap[y])
      .filter((val): val is number | string => val !== undefined);

    const baseSelectStatement = `
      id,
      name,
      email,
      picture_url,
      domain,
      year_of_study,
      member_skills!inner(
          skills!inner(
              name
          )
      )
    `;

    let fetchedMembersData: any[] = [];

    if (search) {
      let nameSearchQuery = supabase.from("members").select(baseSelectStatement);
      let skillSearchQuery = supabase.from("members").select(baseSelectStatement);
      nameSearchQuery = nameSearchQuery.ilike('name', `%${search}%`);
      skillSearchQuery = skillSearchQuery.ilike('member_skills.skills.name', `%${search}%`);

      if (domains.length > 0) {
        nameSearchQuery = nameSearchQuery.in("domain", domains);
        skillSearchQuery = skillSearchQuery.in("domain", domains);
      }

      if (allMappedYears.length > 0) {
        nameSearchQuery = nameSearchQuery.in("year_of_study", allMappedYears);
        skillSearchQuery = skillSearchQuery.in("year_of_study", allMappedYears);
      }

      if (skills.length > 0) {
        nameSearchQuery = nameSearchQuery.in('member_skills.skills.name', skills);
        skillSearchQuery = skillSearchQuery.in('member_skills.skills.name', skills);
      }

      const [nameResult, skillResult] = await Promise.all([nameSearchQuery, skillSearchQuery]);

      if (nameResult.error) {
        console.error("Supabase name search error:", nameResult.error);
        throw new Error(nameResult.error.message);
      }
      if (skillResult.error) {
        console.error("Supabase skill search error:", skillResult.error);
        throw new Error(skillResult.error.message);
      }

      const uniqueResultsMap = new Map();
      [...(nameResult.data || []), ...(skillResult.data || [])].forEach(member => {
        uniqueResultsMap.set(member.id, member);
      });
      fetchedMembersData = Array.from(uniqueResultsMap.values());

    } else {
      let baseQuery = supabase.from("members").select(baseSelectStatement);

      if (domains.length > 0) {
        baseQuery = baseQuery.in("domain", domains);
      }

      if (allMappedYears.length > 0) {
        baseQuery = baseQuery.in("year_of_study", allMappedYears);
      }

      if (skills.length > 0) {
        baseQuery = baseQuery.in('member_skills.skills.name', skills);
      }

      const { data, error } = await baseQuery;
      if (error) {
        console.error("Supabase base query (no search) error:", error);
        throw new Error(error.message);
      }
      fetchedMembersData = data || [];
    }

    const formattedResults = fetchedMembersData.map((member: any) => ({
      ...member,
      skills: member.member_skills.map((ms: any) => ms.skills.name),
      year_of_study: typeof member.year_of_study === 'number'
        ? convertYearToString(member.year_of_study)
        : member.year_of_study
    }));

    const response = NextResponse.json({
      success: true,
      results: formattedResults,
      count: formattedResults.length
    });

    response.headers.set('Cache-Control','no-cache,no-store,must-revalidate,max-age=0');
    response.headers.set('Pragma','no-cache');
    response.headers.set('Expires','0');

    return response;
  } catch (error: any) {
    console.error('Error searching directory:', error);

    const errorResponse = NextResponse.json(
      {
        success: false,
        message: 'Failed to search directory',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );

    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');

    return errorResponse;
  }
}