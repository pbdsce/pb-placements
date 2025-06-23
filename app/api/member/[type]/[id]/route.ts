import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

import {
  AchievementService,
  ExperienceService,
  LinkService,
  SkillService,
  MemberService
} from '@/lib/db';

// This handles GET requests for each type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  try {
    switch (type) {
      case 'achievements': {
        const achievements = await AchievementService.getMemberAchievements(id);
        return NextResponse.json(achievements);
      }
      case 'experience': {
        const experiences = await ExperienceService.getMemberExperiences(id);
        return NextResponse.json(experiences);
      }
      case 'links': {
        const links = await LinkService.getMemberLinks(id);
        return NextResponse.json(links);
      }
      case 'skills': {
        const skills = await SkillService.getMemberSkills(id);
        return NextResponse.json(skills);
      }
      case 'profile': {
        const member = await MemberService.getMemberById(id);
        if (!member) {
          return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
        return NextResponse.json(member);
      }
      default:
        return NextResponse.json({ error: 'Invalid member type' }, { status: 400 });
    }
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch ${type}` },
      { status: 500 }
    );
  }
}

// This handles DELETE for achievements 
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  if (type !== 'achievements') {
    return NextResponse.json({ error: 'DELETE not supported for this type' }, { status: 405 });
  }

  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await AchievementService.deleteAchievement(id);
    return NextResponse.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json(
      { error: 'Failed to delete achievement' },
      { status: 500 }
    );
  }
}