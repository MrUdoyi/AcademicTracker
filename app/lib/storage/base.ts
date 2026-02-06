/**
 * Base storage abstraction layer for local storage operations.
 * Wraps localStorage to enable future migration to database.
 */

const isBrowser = typeof window !== "undefined";

export const storage = {
	/**
	 * Get item from storage
	 */
	get<T>(key: string): T | null {
		if (!isBrowser) return null;

		try {
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : null;
		} catch (error) {
			console.error(`Error reading ${key} from storage:`, error);
			return null;
		}
	},

	/**
	 * Set item in storage
	 */
	set<T>(key: string, value: T): void {
		if (!isBrowser) return;

		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (error) {
			console.error(`Error writing ${key} to storage:`, error);
		}
	},

	/**
	 * Remove item from storage
	 */
	remove(key: string): void {
		if (!isBrowser) return;

		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.error(`Error removing ${key} from storage:`, error);
		}
	},

	/**
	 * Clear all items from storage
	 */
	clear(): void {
		if (!isBrowser) return;

		try {
			localStorage.clear();
		} catch (error) {
			console.error("Error clearing storage:", error);
		}
	},
};
