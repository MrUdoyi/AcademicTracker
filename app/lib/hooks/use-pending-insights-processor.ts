import { useEffect, useState } from "react";
import {
	markPendingActionAttempt,
	removePendingAction,
} from "../storage/queue";
import { filterPendingActionsForUser } from "../utils/pending-actions";

export interface UsePendingInsightsProcessorReturn {
	pendingCount: number;
	successMessage: string | null;
	errorMessage: string | null;
}

/**
 * Hook to process pending AI insights refresh actions from queue
 * Automatically runs when online and user has pending actions
 */
export function usePendingInsightsProcessor(
	userId: string | null,
	isOnline: boolean,
	onFetchInsights: () => Promise<{ success: boolean; error?: string }>,
): UsePendingInsightsProcessorReturn {
	const [pendingCount, setPendingCount] = useState(0);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		if (!userId || !isOnline) return;

		const processPending = async () => {
			const pending = filterPendingActionsForUser("refresh-ai-insights", userId);

			if (pending.length === 0) {
				setPendingCount(0);
				return;
			}

			let successCount = 0;
			let hasError = false;

			for (const action of pending) {
				markPendingActionAttempt(action.id);
				const result = await onFetchInsights();

				if (result.success) {
					removePendingAction(action.id);
					successCount += 1;
				} else {
					markPendingActionAttempt(action.id, result.error);
					setErrorMessage(result.error || "Failed to process queued insights refresh");
					hasError = true;
					break;
				}
			}

			// Update pending count
			const remaining = filterPendingActionsForUser("refresh-ai-insights", userId);
			setPendingCount(remaining.length);

			// Show success message if all were processed
			if (successCount > 0 && remaining.length === 0 && !hasError) {
				setSuccessMessage(
					successCount === 1
						? "Queued AI refresh completed after reconnect."
						: `${successCount} queued AI refreshes completed after reconnect.`,
				);
			}
		};

		void processPending();
	}, [userId, isOnline, onFetchInsights]);

	return {
		pendingCount,
		successMessage,
		errorMessage,
	};
}
