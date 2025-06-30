import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  MemberService,
  SkillService,
  ExperienceService,
  AchievementService,
  LinkService,
} from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      member,
      skills = [],
      experiences = [],
      achievements = [],
      links = [],
    } = await req.json();

    const memberId = user.id;

    await MemberService.upsertMember({ ...member, id: memberId });

    await SkillService.removeSkillsByMemberId(memberId);
    const skillIds = await Promise.all(
      skills.map((name: string) => SkillService.getOrCreateSkill(name))
    );
    await Promise.all(
      skillIds.map((skillId) =>
        SkillService.addSkillToMember(memberId, skillId)
      )
    );

    await ExperienceService.removeExperiencesByMemberId(memberId);
    await Promise.all(
      experiences.map((exp: any) =>
        ExperienceService.createExperience({ ...exp, member_id: memberId })
      )
    );

    await AchievementService.removeAchievementsByMemberId(memberId);
    await Promise.all(
      achievements.map((desc: string) =>
        AchievementService.createAchievement({
          member_id: memberId,
          description: desc,
          title: 'Achievement',
          date: new Date(),
        })
      )
    );

    await LinkService.removeLinksByMemberId(memberId);
    await Promise.all(
      links.map((link: any) =>
        LinkService.createLink({ ...link, member_id: memberId })
      )
    );

    revalidatePath(`/profile/${memberId}`);

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating profile:', err);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
