import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

// Handles PKCE auth code exchange when Supabase redirects back with ?code=...
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/email-link-sign-in?error=auth_callback_failed`,
  );
}

// Syncs auth state changes (e.g. SIGNED_IN, SIGNED_OUT) sent from the client
export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  const { event, session } = await req.json();

  if (event === "SIGNED_IN" && session) {
    await supabase.auth.setSession(session);
  } else if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }

  return NextResponse.json({ status: "success" });
}
