import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !email.endsWith("@pointblank.club")) {
    return NextResponse.json(
      {
        success: false,
        message: "Access denied. Only @pointblank.club emails are allowed.",
      },
      { status: 403 },
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const origin = req.headers.get("origin") ?? "https://career.pointblank.club";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/api/callback` },
  });

  if (error) {
    const status = error.status === 429 ? 429 : (error.status ?? 500);
    return NextResponse.json(
      { success: false, message: error.message },
      { status },
    );
  }

  return NextResponse.json({ success: true });
}
