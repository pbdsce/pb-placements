import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
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

  // Cookie-backed client: signInWithOtp stores the PKCE code verifier in a
  // cookie that travels back to the browser, so /api/callback can complete the
  // exchange when the user clicks the email link.
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteOrigin(req)}/api/callback`,
    },
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
