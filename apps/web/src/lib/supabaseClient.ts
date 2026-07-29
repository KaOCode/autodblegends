import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Supabase's new API key format (sb_publishable_...) is the client-safe
// drop-in replacement for the old JWT anon key - safe to ship in the
// browser bundle, unlike the sb_secret_... key (never expose that here).
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Cloud sync is entirely optional: without these env vars the app just
 * runs local-only (localStorage), which satisfies "no registration
 * required". Set them to enable "sign in to keep your data across
 * devices". See supabase/schema.sql for the expected tables. */
export const supabase: SupabaseClient | null =
  url && publishableKey ? createClient(url, publishableKey) : null;

export const isCloudSyncEnabled = supabase !== null;
