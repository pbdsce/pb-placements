import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  MemberService,
  SkillService,
  ExperienceService,
  AchievementService,
  LinkService,
  CertificationService,
  ProjectService,
} from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { profileUpdateSchema } from '@/lib/validations/profile-update';

const createAuthenticatedClient = (token: string): SupabaseClient => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const supabase = createAuthenticatedClient(token);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Auth error:', error?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await req.json();

    const result = profileUpdateSchema.safeParse(rawBody);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const {
      member,
      skills,
      experiences,
      achievements,
      links,
      certifications,
      projects,
      resume_url,
    } = result.data;

    const memberData = { ...member, id: user.id };
    if (resume_url) {
      memberData.resume_url = resume_url;
    }

    const existingMember = await MemberService.getMemberById(supabase, user.id);
    const memberExists = !!existingMember;

    await MemberService.upsertMember(supabase, memberData);

    await SkillService.removeSkillsByMemberId(supabase, user.id);
    if (skills && skills.length > 0) {
      const skillIds = await Promise.all(
        skills.map((name: string) => SkillService.getOrCreateSkill(supabase, name))
      );
      await Promise.all(
        skillIds.map(skillId => skillId && SkillService.addSkillToMember(supabase, user.id, skillId))
      );
    }

    await ExperienceService.removeExperiencesByMemberId(supabase, user.id);
    if (experiences && experiences.length > 0) {
      const experiencesToInsert = experiences.map((exp: any) => ({
        ...exp,
        member_id: user.id
      }));
      await ExperienceService.createExperiences(supabase, experiencesToInsert);
    }

    await AchievementService.removeAchievementsByMemberId(supabase, user.id);
    if (achievements && achievements.length > 0) {
      const achievementsToInsert = achievements.map((desc: string) => ({
        member_id: user.id,
        description: desc,
        title: 'Achievement',
        date: new Date().toISOString(),
      }));
      await AchievementService.createAchievements(supabase, achievementsToInsert);
    }

    await LinkService.removeLinksByMemberId(supabase, user.id);
    if (links && links.length > 0) {
      const linksToInsert = links.map((link: any) => ({
        ...link,
        member_id: user.id
      }));
      await LinkService.createLinks(supabase, linksToInsert);
    }
     // 6. Clear and re-insert certifications (like achievements)
    await CertificationService.removeCertificationsByMemberId(supabase, user.id);
    if (certifications && certifications.length > 0) {
      const certsToInsert = (certifications as any[])
        .filter((cert: any) => cert.name && cert.name.trim())
        .map((cert: any) => {
          const obj: any = {
            name: cert.name,
            member_id: user.id,
          };
          if (cert.issuing_organization && cert.issuing_organization.trim() !== '') {
            obj.issuing_organization = cert.issuing_organization;
          }
          return obj;
        });
      await CertificationService.createCertifications(supabase, certsToInsert);
    }

    // 7. Clear and re-insert projects (like certifications)
    await ProjectService.removeProjectsByMemberId(supabase, user.id);
    if (projects && projects.length > 0) {
      const projectsToInsert = (projects as any[])
        .filter((proj: any) => proj.name && proj.name.trim())
        .map((proj: any) => {
          const obj: any = {
            name: proj.name,
            description: proj.description,
            link: proj.link,
            member_id: user.id,
          };
          return obj;
        });
      await ProjectService.createProjects(supabase, projectsToInsert);
    }

    const userFolder = `resumes/${user.id}`;
    const { data: resumeFiles } = await supabase.storage
      .from('resume')
      .list(userFolder);

    const resumeCount = resumeFiles?.length || 0;

    if (resumeCount > 4 && resumeFiles) {
      const sorted = resumeFiles.sort((a, b) =>
        new Date(a.created_at || a.name).getTime() - new Date(b.created_at || b.name).getTime()
      );

      const oldest = sorted[0];
      if (oldest) {
        const { error: deleteError } = await supabase.storage
          .from('resume')
          .remove([`${userFolder}/${oldest.name}`]);

        if (deleteError) {
          console.error('Failed to delete oldest resume:', deleteError);
        } else {
          console.log('Deleted oldest resume version:', oldest.name);
        }
      }
    } 

    revalidatePath(`/profile/${user.id}`);

    return NextResponse.json({ 
      message: memberExists ? 'Profile updated successfully' : 'Profile created successfully',
      isUpdate: memberExists,
      resumeVersions: resumeCount
    });

  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const supabase = createAuthenticatedClient(token);

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Auth error:', error?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userFolder = `resumes/${user.id}`;
    const { data: files, error: storageError } = await supabase.storage
      .from('resume')
      .list(userFolder);

    if (storageError) {
      throw storageError;
    }

    const resumeVersions = files?.map(file => ({
      name: file.name,
      created_at: file.created_at,
      size: file.metadata?.size || 0,
      publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resume/${userFolder}/${file.name}`
    })) || [];

    // Sort by creation date, newest first
    resumeVersions.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      resumeVersions,
      count: resumeVersions.length
    });

  } catch (error: any) {
    console.error('Error fetching resume versions:', error);
    return NextResponse.json({ error: 'Failed to fetch resume versions' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    const supabase = createAuthenticatedClient(token);

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Auth error:', error?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    const userFolder = `resumes/${user.id}`;
    const { error: deleteError } = await supabase.storage
      .from('resume')
      .remove([`${userFolder}/${fileName}`]);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ message: 'Resume version deleted successfully' });

  } catch (error: any) {
    console.error('Error deleting resume version:', error);
    return NextResponse.json({ error: 'Failed to delete resume version' }, { status: 500 });
  }
}