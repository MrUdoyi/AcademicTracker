import { v4 as uuidv4 } from "uuid";
import { storage } from "./base";

const PENDING_ACTIONS_KEY = "apt_pending_actions";

export type PendingActionType = "refresh-ai-insights";

export interface PendingAction<T = unknown> {
	id: string;
	type: PendingActionType;
	payload: T;
	createdAt: string;
	attempts: number;
	lastError?: string;
}

function getAllPendingActions(): PendingAction[] {
	return storage.get<PendingAction[]>(PENDING_ACTIONS_KEY) || [];
}

function saveAllPendingActions(actions: PendingAction[]): void {
	storage.set(PENDING_ACTIONS_KEY, actions);
}

export function getPendingActions(type?: PendingActionType): PendingAction[] {
	const actions = getAllPendingActions();
	if (!type) return actions;

	return actions.filter((action) => action.type === type);
}

export function enqueuePendingAction<T>(
	type: PendingActionType,
	payload: T,
	options?: { dedupeByPayload?: boolean },
): PendingAction<T> {
	const actions = getAllPendingActions();

	if (options?.dedupeByPayload) {
		const existing = actions.find(
			(action) =>
				action.type === type &&
				JSON.stringify(action.payload) === JSON.stringify(payload),
		);

		if (existing) {
			return existing as PendingAction<T>;
		}
	}

	const nextAction: PendingAction<T> = {
		id: uuidv4(),
		type,
		payload,
		createdAt: new Date().toISOString(),
		attempts: 0,
	};

	actions.push(nextAction);
	saveAllPendingActions(actions);

	return nextAction;
}

export function removePendingAction(id: string): void {
	const actions = getAllPendingActions();
	const nextActions = actions.filter((action) => action.id !== id);
	saveAllPendingActions(nextActions);
}

export function markPendingActionAttempt(
	id: string,
	errorMessage?: string,
): void {
	const actions = getAllPendingActions();
	const index = actions.findIndex((action) => action.id === id);
	if (index === -1) return;

	actions[index] = {
		...actions[index],
		attempts: actions[index].attempts + 1,
		lastError: errorMessage,
	};

	saveAllPendingActions(actions);
}