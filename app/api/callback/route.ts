import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

// Handles PKCE auth code exchange when Supabase redirects back with ?code=...
// The cookie-backed client reads the code verifier set during sign-in and
// writes the resulting session cookies onto the redirect response.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const origin =
    process.env.NEXT_PUBLIC_DOMAIN || "https://careers.pointblank.club";
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/email-link-sign-in?error=auth_callback_failed`,
  );
}
