import { useEffect, useState } from "react";
import { getSessionToken, getBiometricConfig } from "../storage/biometric";

/**
 * Hook to check if user needs biometric setup or is locked
 * Returns whether user is authenticated and should see main app
 */
export function useBiometricStatus(userId: string | null) {
	const [isUnlocked, setIsUnlocked] = useState(false);
	const [needsSetup, setNeedsSetup] = useState(false);
	const [isLocked, setIsLocked] = useState(true);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!userId) {
			setLoading(false);
			setIsLocked(true);
			setNeedsSetup(false);
			setIsUnlocked(false);
			return;
		}

		setLoading(true);

		// Check if user has biometric setup
		const config = getBiometricConfig(userId);

		if (!config) {
			// First time - needs setup
			setNeedsSetup(true);
			setIsLocked(false);
			setIsUnlocked(false);
		} else {
			// Has setup - check session
			const sessionToken = getSessionToken(userId);
			if (sessionToken) {
				// Session active - unlocked
				setIsUnlocked(true);
				setIsLocked(false);
				setNeedsSetup(false);
			} else {
				// No session - locked
				setIsUnlocked(false);
				setIsLocked(true);
				setNeedsSetup(false);
			}
		}

		setLoading(false);
	}, [userId]);

	return {
		isUnlocked, // User verified and session active
		isLocked, // User needs to verify PIN/biometric
		needsSetup, // User needs to set up security first
		loading, // Still checking status
	};
}

/**
 * Hook to get session duration remaining in milliseconds
 */
export function useSessionDuration(userId: string | null) {
	const [remaining, setRemaining] = useState<number | null>(null);

	useEffect(() => {
		if (!userId) return;

		const config = getBiometricConfig(userId);
		if (!config || !config.lastUnlockedAt) {
			setRemaining(null);
			return;
		}

		const updateRemaining = () => {
			const unlockedTime = new Date(config.lastUnlockedAt!).getTime();
			const now = new Date().getTime();
			const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
			const rem = sessionDuration - (now - unlockedTime);

			if (rem > 0) {
				setRemaining(rem);
			} else {
				setRemaining(null);
			}
		};

		updateRemaining();
		const interval = setInterval(updateRemaining, 60000); // Check every minute

		return () => clearInterval(interval);
	}, [userId]);

	return remaining;
}
