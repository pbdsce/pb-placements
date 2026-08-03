import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Client } from "pg";

const relatedTables = [
  "member_skills",
  "achievements",
  "experiences",
  "links",
  "certifications",
  "projects",
] as const;

async function deleteMemberRows(memberId: string, sessionClient: ReturnType<typeof createClient>) {
  if (process.env.DATABASE_URL) {
    const configuredUrl = new URL(process.env.DATABASE_URL);
    const directHostMatch = configuredUrl.hostname.match(/^db\.([^.]+)\.supabase\.co$/);
    const databaseConfig = directHostMatch
      ? {
          // Supabase direct database hosts are IPv6-only for this project,
          // while the staging cluster has IPv4 egress. Session pooler mode
          // keeps the same database credentials and works from staging.
          host: `aws-0-${process.env.SUPABASE_DB_REGION || "ap-south-1"}.pooler.supabase.com`,
          port: 5432,
          user: `postgres.${directHostMatch[1]}`,
          password: decodeURIComponent(configuredUrl.password),
          database: configuredUrl.pathname.slice(1) || "postgres",
          ssl: { rejectUnauthorized: false },
        }
      : {
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        };

    const databaseClient = new Client({
      ...databaseConfig,
    });

    await databaseClient.connect();
    try {
      await databaseClient.query("BEGIN");

      for (const table of relatedTables) {
        await databaseClient.query(
          `DELETE FROM public.${table} WHERE member_id = $1`,
          [memberId],
        );
      }

      const result = await databaseClient.query(
        "DELETE FROM public.members WHERE id = $1 RETURNING id",
        [memberId],
      );

      if (result.rowCount !== 1) {
        throw new Error("No member row was deleted");
      }

      await databaseClient.query("COMMIT");
      return;
    } catch (error) {
      await databaseClient.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      await databaseClient.end();
    }
  }

  const deletionClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : sessionClient;

  for (const table of relatedTables) {
    const { error } = await deletionClient.from(table).delete().eq("member_id", memberId);
    if (error) throw error;
  }

  const { data: deletedMembers, error: memberError } = await deletionClient
    .from("members")
    .delete()
    .eq("id", memberId)
    .select("id");

  if (memberError) throw memberError;
  if (!deletedMembers?.length) {
    throw new Error(
      "No member row was deleted. Configure DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or an authenticated DELETE policy.",
    );
  }
}

export async function DELETE() {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteMemberRows(user.id, supabase);

    const storageClient = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        )
      : supabase;

    const { data: resumeFiles, error: resumeListError } = await storageClient.storage
      .from("resume")
      .list(`resumes/${user.id}`);

    if (!resumeListError && resumeFiles?.length) {
      await storageClient.storage
        .from("resume")
        .remove(resumeFiles.map((file) => `resumes/${user.id}/${file.name}`));
    }

    const { data: pictureFiles, error: pictureListError } = await storageClient.storage
      .from("profile-pictures")
      .list("");

    if (!pictureListError && pictureFiles?.length) {
      const userPictures = pictureFiles
        .filter((file) => file.name.startsWith(`${user.id}-`))
        .map((file) => file.name);

      if (userPictures.length) {
        await storageClient.storage.from("profile-pictures").remove(userPictures);
      }
    }

    revalidatePath("/directory");
    revalidatePath(`/profile/${user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting profile:", error);
    return NextResponse.json(
      { error: "Could not delete your profile. Please try again." },
      { status: 500 },
    );
  }
}
