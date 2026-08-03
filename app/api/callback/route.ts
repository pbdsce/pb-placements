import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";
import { getSiteOrigin } from "@/lib/site-url";

// Handles PKCE auth code exchange when Supabase redirects back with ?code=...
// The cookie-backed client reads the code verifier set during sign-in and
// writes the resulting session cookies onto the redirect response.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const origin = getSiteOrigin(req);
  const next = searchParams.get("next") ?? "/";
  const redirect = (url: string) => {
    const response = NextResponse.redirect(url);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirect(`${origin}${next}`);
    }
  }

  return redirect(
    `${origin}/auth/email-link-sign-in?error=auth_callback_failed`,
  );
}
