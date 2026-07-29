import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Cloud sync is entirely optional: without these env vars the app just
 * runs local-only (localStorage), which satisfies "no registration
 * required". Set them to enable "sign in to keep your data across
 * devices". See supabase/schema.sql for the expected tables. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export const isCloudSyncEnabled = supabase !== null;
