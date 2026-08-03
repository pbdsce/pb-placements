import { createBrowserClient } from "@supabase/ssr";

// Cookie-backed browser client. Sharing the cookie store with the server
// clients (middleware, route handlers, server components) gives the whole app a
// single source of truth for the session.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookieEncoding: "raw" },
);
