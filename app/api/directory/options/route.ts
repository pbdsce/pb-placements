import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function GET() {
  const { data: skillsData } = await supabase.from("skills").select("name");
  const { data: domainData } = await supabase.from("members").select("domain");

  return NextResponse.json({
    skills: (skillsData ?? []).map((s) => s.name),
    domains: Array.from(new Set((domainData ?? []).map((d) => d.domain))).sort(),
  });
}
