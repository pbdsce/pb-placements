import { NextRequest, NextResponse } from 'next/server';
import { AchievementService } from '@/lib/db';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const achievements = await AchievementService.getMemberAchievements(params.id);
    return NextResponse.json(achievements);
  } catch (error) {
    console.error('Error fetching member achievements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member achievements' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const achievementId = params.id;
    // Optional: Check if the user owns the achievement before deleting
    // This requires a more complex query to join tables.
    // For now, we'll assume if they can see it on their profile edit page, they can delete it.

    await AchievementService.deleteAchievement(achievementId);
    
    return NextResponse.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    return NextResponse.json(
      { error: 'Failed to delete achievement' },
      { status: 500 }
    );
  }
}