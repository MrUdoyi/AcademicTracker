import { useCallback, useEffect, useState } from "react";
import {
	getLastAiSyncStatus,
	saveLastAiSyncStatus,
	type LastAiSyncStatus,
} from "../storage/insights";

export interface UseInsightsSyncStatusReturn {
	syncStatus: LastAiSyncStatus | null;
	recordSuccess: (detail: string) => void;
	recordError: (detail: string) => void;
	clearStatus: () => void;
}

/**
 * Hook to manage AI insights sync status tracking and persistence
 * Automatically loads from localStorage on mount
 */
export function useInsightsSyncStatus(
	userId: string | null,
): UseInsightsSyncStatusReturn {
	const [syncStatus, setSyncStatus] = useState<LastAiSyncStatus | null>(null);

	// Load sync status from localStorage on mount
	useEffect(() => {
		if (!userId) return;
		void (async () => {
			const status = await getLastAiSyncStatus(userId);
			setSyncStatus(status);
		})();
	}, [userId]);

	const recordSuccess = useCallback((detail: string) => {
		if (!userId) return;
		void saveLastAiSyncStatus(userId, "success", detail);
		setSyncStatus({
			userId,
			status: "success",
			at: new Date().toISOString(),
			detail,
		});
	}, [userId]);

	const recordError = useCallback((detail: string) => {
		if (!userId) return;
		void saveLastAiSyncStatus(userId, "error", detail);
		setSyncStatus({
			userId,
			status: "error",
			at: new Date().toISOString(),
			detail,
		});
	}, [userId]);

	const clearStatus = useCallback(() => {
		setSyncStatus(null);
	}, []);

	return {
		syncStatus,
		recordSuccess,
		recordError,
		clearStatus,
	};
}
