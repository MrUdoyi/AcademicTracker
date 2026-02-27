import { supabase } from "../supabase/client";

export interface CachedAiInsights {
	userId: string;
	insights: string[];
	generatedAt: string;
}

export interface LastAiSyncStatus {
	userId: string;
	status: "success" | "error";
	at: string;
	detail: string;
}

/**
 * Get cached AI insights for a specific user
 */
export async function getCachedAiInsights(userId: string): Promise<CachedAiInsights | null> {
	const { data, error } = await supabase
		.from("insights")
		.select("insights, generated_at")
		.eq("user_id", userId)
		.single();

	if (error || !data) return null;

	return {
		userId,
		insights: (data.insights as string[]) || [],
		generatedAt: data.generated_at as string,
	};
}

/**
 * Save AI insights cache for a specific user
 */
export async function saveCachedAiInsights(userId: string, insights: string[]): Promise<void> {
	const { error } = await supabase.from("insights").upsert({
		user_id: userId,
		insights,
		generated_at: new Date().toISOString(),
	});

	if (error) throw new Error(error.message);
}

/**
 * Get last AI sync status for a specific user
 */
export async function getLastAiSyncStatus(userId: string): Promise<LastAiSyncStatus | null> {
	const { data, error } = await supabase
		.from("insights")
		.select("last_sync_status, last_sync_at, last_sync_detail")
		.eq("user_id", userId)
		.single();

	if (error || !data || !data.last_sync_status || !data.last_sync_at) return null;

	return {
		userId,
		status: data.last_sync_status as "success" | "error",
		at: data.last_sync_at as string,
		detail: (data.last_sync_detail as string) || "",
	};
}

/**
 * Save last AI sync status for a specific user
 */
export async function saveLastAiSyncStatus(
	userId: string,
	status: "success" | "error",
	detail: string,
): Promise<void> {
	const { error } = await supabase.from("insights").upsert({
		user_id: userId,
		last_sync_status: status,
		last_sync_at: new Date().toISOString(),
		last_sync_detail: detail,
		generated_at: new Date().toISOString(),
	});

	if (error) throw new Error(error.message);
}