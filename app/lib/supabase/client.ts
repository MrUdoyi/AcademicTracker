import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const hasPlaceholderValues =
	supabaseUrl?.includes("your_supabase_project_url_here") ||
	supabaseAnonKey?.includes("your_supabase_anon_key_here");

if (!supabaseUrl || !supabaseAnonKey || hasPlaceholderValues) {
	throw new Error(
		"Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
	);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
