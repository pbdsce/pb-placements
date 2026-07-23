import { NextRequest, NextResponse } from 'next/server';
import { ProjectService } from '@/lib/db';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectPostSchema } from '@/lib/validations/project';

const getAuthenticatedUser = async (
  req: NextRequest
): Promise<{ supabase: SupabaseClient; user: any } | null> => {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } }
    }
  );

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { supabase, user };
  } catch {
    return null;
  }
};

export async function GET(req: NextRequest, context: any) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const projects = await ProjectService.getMemberProjects(supabase, context.params.memberId);
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: any) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { supabase, user } = auth;

    if (user.id !== context.params.memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const result = projectPostSchema.safeParse(body);
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

    const validated = result.data;

    if (Array.isArray(validated)) {
      const data = await Promise.all(
        validated.map((project) =>
          ProjectService.createProject(supabase, { ...project, member_id: context.params.memberId })
        )
      );
      return NextResponse.json(data);
    } else {
      const data = await ProjectService.createProject(supabase, { ...validated, member_id: context.params.memberId });
      return NextResponse.json(data);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: any) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { supabase, user } = auth;

    if (user.id !== context.params.memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    // expects { id, ...fields }
    const { id, ...fields } = body;
    const data = await ProjectService.updateProject(supabase, id, fields);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: any) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { supabase, user } = auth;

    if (user.id !== context.params.memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await ProjectService.removeProjectsByMemberId(supabase, context.params.memberId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 