import { getPendingActions } from "../storage/queue";
import type { PendingAction } from "../storage/queue";

/**
 * Utility to safely extract userId from pending action payload
 */
export function getPayloadUserId(action: PendingAction): string | null {
	if (
		typeof action.payload === "object" &&
		action.payload !== null &&
		"userId" in action.payload
	) {
		return (action.payload as { userId: string }).userId;
	}
	return null;
}

/**
 * Filter pending actions by type and userId
 */
export function filterPendingActionsForUser(
	type: string,
	userId: string,
): PendingAction[] {
	return getPendingActions(type).filter(
		(action) => getPayloadUserId(action) === userId,
	);
}

/**
 * Check if user has pending actions of a specific type
 */
export function hasPendingActionsForUser(type: string, userId: string): boolean {
	return filterPendingActionsForUser(type, userId).length > 0;
}
