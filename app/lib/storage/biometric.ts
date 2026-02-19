import { storage } from "./base";

const BIOMETRIC_CONFIG_KEY = "apt_biometric_config";

export interface BiometricConfig {
	userId: string;
	pin: string; // hashed PIN for fallback
	biometricEnabled: boolean;
	biometricType: "faceId" | "fingerprint" | "pin"; // preferred method
	createdAt: string;
	lastUnlockedAt: string | null;
}

/**
 * Hash a PIN using simple algorithm (for demo; production should use proper crypto)
 */
function hashPin(pin: string): string {
	let hash = 0;
	for (let i = 0; i < pin.length; i++) {
		const char = pin.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs(hash).toString(16);
}

/**
 * Get biometric config for user
 */
export function getBiometricConfig(userId: string): BiometricConfig | null {
	const configs = storage.get<BiometricConfig[]>(BIOMETRIC_CONFIG_KEY) || [];
	return configs.find((config) => config.userId === userId) || null;
}

/**
 * Set up biometric/PIN auth for user
 */
export function setupBiometricAuth(
	userId: string,
	pin: string,
	biometricType: "faceId" | "fingerprint" | "pin" = "pin",
): BiometricConfig {
	const configs = storage.get<BiometricConfig[]>(BIOMETRIC_CONFIG_KEY) || [];
	const hashedPin = hashPin(pin);

	const config: BiometricConfig = {
		userId,
		pin: hashedPin,
		biometricEnabled: biometricType !== "pin",
		biometricType,
		createdAt: new Date().toISOString(),
		lastUnlockedAt: null,
	};

	const index = configs.findIndex((c) => c.userId === userId);
	if (index === -1) {
		configs.push(config);
	} else {
		configs[index] = config;
	}

	storage.set(BIOMETRIC_CONFIG_KEY, configs);
	return config;
}

/**
 * Verify PIN and update last unlocked time
 */
export function verifyPin(userId: string, pin: string): boolean {
	const config = getBiometricConfig(userId);
	if (!config) return false;

	const hashedPin = hashPin(pin);
	const isValid = hashedPin === config.pin;

	if (isValid) {
		const configs = storage.get<BiometricConfig[]>(BIOMETRIC_CONFIG_KEY) || [];
		const index = configs.findIndex((c) => c.userId === userId);
		if (index !== -1) {
			configs[index].lastUnlockedAt = new Date().toISOString();
			storage.set(BIOMETRIC_CONFIG_KEY, configs);
		}
	}

	return isValid;
}

/**
 * Check if biometric is available on device (browser-based for now)
 */
export async function isBiometricAvailable(): Promise<boolean> {
	try {
		// Check for WebAuthn support (FIDO2/biometric)
		if (window.PublicKeyCredential) {
			const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
			return isAvailable;
		}
		return false;
	} catch {
		return false;
	}
}

/**
 * Check if user has completed biometric setup
 */
export function hasBiometricSetup(userId: string): boolean {
	const config = getBiometricConfig(userId);
	return config !== null && config.biometricType !== "pin";
}

/**
 * Get current session token if recently unlocked
 */
export function getSessionToken(userId: string): string | null {
	const config = getBiometricConfig(userId);
	if (!config || !config.lastUnlockedAt) return null;

	// Session valid for 24 hours
	const unlockedTime = new Date(config.lastUnlockedAt).getTime();
	const now = new Date().getTime();
	const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

	if (now - unlockedTime < sessionDuration) {
		return `session_${config.userId}_${config.lastUnlockedAt}`;
	}

	return null;
}

/**
 * Clear session (logout)
 */
export function clearSession(userId: string): void {
	const configs = storage.get<BiometricConfig[]>(BIOMETRIC_CONFIG_KEY) || [];
	const index = configs.findIndex((c) => c.userId === userId);
	if (index !== -1) {
		configs[index].lastUnlockedAt = null;
		storage.set(BIOMETRIC_CONFIG_KEY, configs);
	}
}
