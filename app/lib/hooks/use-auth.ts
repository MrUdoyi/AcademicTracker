"use client";

import { useState } from "react";
import type { User } from "../schemas/user";
import { getCurrentUser } from "../storage/user";

/**
 * Hook for accessing current authenticated user
 */
export function useAuth() {
	const [user, setUser] = useState<User | null>(() => getCurrentUser());
	const loading = false;

	const refreshUser = () => {
		const currentUser = getCurrentUser();
		setUser(currentUser);
	};

	return { user, loading, refreshUser };
}
