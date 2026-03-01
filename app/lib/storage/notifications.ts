import { storage } from "./base";

const READ_NOTIFICATIONS_KEY_PREFIX = "apt_read_notifications";

function getUserNotificationsKey(userId: string): string {
	return `${READ_NOTIFICATIONS_KEY_PREFIX}:${userId}`;
}

export function getReadNotificationIds(userId: string): string[] {
	const key = getUserNotificationsKey(userId);
	return storage.get<string[]>(key) || [];
}

export function saveReadNotificationIds(userId: string, ids: string[]): void {
	const key = getUserNotificationsKey(userId);
	storage.set(key, ids);
}
