import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { MemberService, SkillService, ExperienceService, AchievementService, LinkService } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      member,
      skills,
      experiences,
      achievements,
      links,
    } = await req.json();

    // 1. Upsert Member
    await MemberService.upsertMember(member);
    
    // 2. Clear and re-insert skills
    await SkillService.removeSkillsByMemberId(member.id);
    if (skills && skills.length > 0) {
      const skillIds = await Promise.all(
        skills.map((name: string) => SkillService.getOrCreateSkill(name))
      );
      await Promise.all(
        skillIds.map(skillId => SkillService.addSkillToMember(member.id, skillId))
      );
    }

    // 3. Clear and re-insert experiences
    await ExperienceService.removeExperiencesByMemberId(member.id);
    if (experiences && experiences.length > 0) {
      await Promise.all(
        experiences.map((exp: any) => ExperienceService.createExperience({ ...exp, member_id: member.id }))
      );
    }
    
    // 4. Clear and re-insert achievements
    await AchievementService.removeAchievementsByMemberId(member.id);
    if (achievements && achievements.length > 0) {
      await Promise.all(
        achievements.map((desc: string) => AchievementService.createAchievement({ 
          member_id: member.id, 
          description: desc,
          title: 'Achievement', // title is required, but not used in the UI
          date: new Date() 
        }))
      );
    }
    
    // 5. Clear and re-insert links
    await LinkService.removeLinksByMemberId(member.id);
    if (links && links.length > 0) {
      await Promise.all(
        links.map((link: any) => LinkService.createLink({ ...link, member_id: member.id }))
      );
    }

    // 6. Revalidate cache for the profile page
    revalidatePath(`/profile/${member.id}`);

    return NextResponse.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}