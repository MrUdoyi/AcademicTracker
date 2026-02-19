"use client";

import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { useEffect, useState } from "react";

function getInitialOnlineState(): boolean {
	if (typeof navigator === "undefined") {
		return true;
	}

	return navigator.onLine;
}

/**
 * Hook for tracking browser online/offline state
 */
export function useNetworkStatus() {
	const [isOnline, setIsOnline] = useState<boolean>(getInitialOnlineState);

	useEffect(() => {
		if (typeof window === "undefined") return;
		let networkListener: PluginListenerHandle | null = null;

		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		const setupNativeNetworkListener = async () => {
			if (!Capacitor.isNativePlatform()) return;

			try {
				const status = await Network.getStatus();
				setIsOnline(status.connected);

				networkListener = await Network.addListener(
					"networkStatusChange",
					(status) => {
						setIsOnline(status.connected);
					},
				);
			} catch (error) {
				console.error("Failed to initialize Capacitor network listener:", error);
			}
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		void setupNativeNetworkListener();

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			if (networkListener) {
				void networkListener.remove();
			}
		};
	}, []);

	return { isOnline };
}