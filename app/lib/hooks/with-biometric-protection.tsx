import type { ComponentType } from "react";
import { useBiometricStatus } from "./use-biometric-status";
import { useAuth } from "./use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function withBiometricProtection<P extends object>(Component: ComponentType<P>) {
	return function ProtectedComponent(props: P) {
		const router = useRouter();
		const { user, loading: authLoading } = useAuth();
		const { isUnlocked, isLocked, needsSetup, loading: bioLoading } = useBiometricStatus(
			user?.id || null,
		);

		useEffect(() => {
			if (authLoading || bioLoading) return;

			// Not logged in - go to login
			if (!user) {
				router.push("/");
				return;
			}

			// Needs to set up biometric first
			if (needsSetup) {
				router.push("/biometric-setup");
				return;
			}

			// Is locked - go to lock screen
			if (isLocked) {
				router.push("/lock-screen");
				return;
			}
		}, [user, isUnlocked, isLocked, needsSetup, authLoading, bioLoading, router]);

		// Show loading while checking auth/biometric status
		if (authLoading || bioLoading || !isUnlocked) {
			return (
				<div className="min-h-screen flex items-center justify-center">
					<span className="loading loading-spinner loading-lg" />
				</div>
			);
		}

		// User is unlocked and authenticated - render component
		return <Component {...props} />;
	};
}
