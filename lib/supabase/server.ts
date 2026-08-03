import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cookie-backed Supabase client for Route Handlers and Server Components.
// In Route Handlers the cookie store is writable, so the PKCE code verifier
// (and refreshed session) round-trips through the browser's cookies. In Server
// Components writing is a no-op (the store is read-only) — the middleware
// refreshes the session there instead.
export const createClient = () => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "raw",
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; the session is
            // refreshed by middleware.
          }
        },
      },
    },
  );
};
