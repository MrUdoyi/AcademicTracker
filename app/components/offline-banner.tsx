"use client";

import { AlertCircle } from "lucide-react";
import { useNetworkStatus } from "../lib/hooks/use-network-status";

export function OfflineBanner() {
	const { isOnline } = useNetworkStatus();

	if (isOnline) return null;

	return (
		<div role="alert" className="alert alert-warning mb-6">
			<AlertCircle className="h-6 w-6 shrink-0" />
			<span>
				You are offline. Core features continue to work locally and online-only
				services are temporarily unavailable.
			</span>
		</div>
	);
}