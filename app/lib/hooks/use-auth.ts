"use client";

import { useEffect, useState } from "react";
import type { User } from "../schemas/user";
import { getCurrentUser } from "../storage/user";

/**
 * Hook for accessing current authenticated user
 */
export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let isMounted = true;

		const loadUser = async () => {
			setLoading(true);
			try {
				const currentUser = await getCurrentUser();
				if (isMounted) setUser(currentUser);
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		void loadUser();

		return () => {
			isMounted = false;
		};
	}, []);

	const refreshUser = async () => {
		const currentUser = await getCurrentUser();
		setUser(currentUser);
	};

	return { user, loading, refreshUser };
}
