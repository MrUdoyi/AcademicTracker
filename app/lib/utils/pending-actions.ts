import { getPendingActions } from "../storage/queue";
import type { PendingAction, PendingActionType } from "../storage/queue";

/**
 * Utility to safely extract userId from pending action payload
 * Ensures type safety when working with pending actions
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
	type: PendingActionType,
	userId: string,
): PendingAction[] {
	return getPendingActions(type).filter(
		(action) => getPayloadUserId(action) === userId,
	);
}

/**
 * Check if user has pending actions of a specific type
 */
export function hasPendingActionsForUser(
	type: PendingActionType,
	userId: string,
): boolean {
	return filterPendingActionsForUser(type, userId).length > 0;
}
