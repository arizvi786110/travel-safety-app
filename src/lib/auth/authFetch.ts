import { supabase } from "./supabaseClient";

export async function authFetch(url: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return fetch(url, {
    ...init,
    headers: {
      ...((init.headers as Record<string, string>) ?? {}),
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
}