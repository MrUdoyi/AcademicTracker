import { storage } from "./base";

const AI_INSIGHTS_KEY = "apt_ai_insights";
const LAST_AI_SYNC_KEY = "apt_last_ai_sync";

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
 * Get all cached AI insights from storage
 */
function getAllCachedInsights(): CachedAiInsights[] {
	return storage.get<CachedAiInsights[]>(AI_INSIGHTS_KEY) || [];
}

/**
 * Get cached AI insights for a specific user
 */
export function getCachedAiInsights(userId: string): CachedAiInsights | null {
	const allInsights = getAllCachedInsights();
	return allInsights.find((entry) => entry.userId === userId) || null;
}

/**
 * Save AI insights cache for a specific user
 */
export function saveCachedAiInsights(userId: string, insights: string[]): void {
	const allInsights = getAllCachedInsights();
	const nextEntry: CachedAiInsights = {
		userId,
		insights,
		generatedAt: new Date().toISOString(),
	};

	const index = allInsights.findIndex((entry) => entry.userId === userId);

	if (index === -1) {
		allInsights.push(nextEntry);
	} else {
		allInsights[index] = nextEntry;
	}

	storage.set(AI_INSIGHTS_KEY, allInsights);
}

/**
 * Get last AI sync status for a specific user
 */
export function getLastAiSyncStatus(userId: string): LastAiSyncStatus | null {
	const allStatuses = storage.get<LastAiSyncStatus[]>(LAST_AI_SYNC_KEY) || [];
	return allStatuses.find((entry) => entry.userId === userId) || null;
}

/**
 * Save last AI sync status for a specific user
 */
export function saveLastAiSyncStatus(
	userId: string,
	status: "success" | "error",
	detail: string,
): void {
	const allStatuses = storage.get<LastAiSyncStatus[]>(LAST_AI_SYNC_KEY) || [];
	const nextEntry: LastAiSyncStatus = { userId, status, at: new Date().toISOString(), detail };
	const index = allStatuses.findIndex((entry) => entry.userId === userId);
	index === -1 ? allStatuses.push(nextEntry) : (allStatuses[index] = nextEntry);
	storage.set(LAST_AI_SYNC_KEY, allStatuses);
}