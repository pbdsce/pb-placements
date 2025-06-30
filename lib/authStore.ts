import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

type AuthState = {
  user: SupabaseUser | null;
  setUser: (user: SupabaseUser | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

export const initAuthListener = () => {

  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setUser(session?.user ?? null);
  });

  supabase.auth.onAuthStateChange(async (event, session) => {
    useAuthStore.getState().setUser(session?.user ?? null);

    await fetch("/api/callback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event, session }),
    });
  });
};
