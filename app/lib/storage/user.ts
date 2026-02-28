import type { LoginInput, RegisterInput, User } from "../schemas/user";
import { supabase } from "../supabase/client";

function normalizeAuthError(error: unknown): Error {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (message.includes("failed to fetch") || message.includes("networkerror")) {
			return new Error(
				"Cannot reach Supabase. Check your internet connection and verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment.",
			);
		}

		return error;
	}

	return new Error("Authentication failed. Please try again.");
}

function mapSupabaseUserToAppUser(
	user: { id: string; email?: string | null; created_at?: string },
	profileName?: string,
): User {
	return {
		id: user.id,
		email: user.email || "",
		name: profileName || user.email?.split("@")[0] || "Student",
		password: "",
		createdAt: user.created_at || new Date().toISOString(),
	};
}

/**
 * Create new user (registration)
 */
export async function createUser(data: RegisterInput): Promise<User> {
	let authData:
		| {
				user: {
					id: string;
					email?: string | null;
					created_at?: string;
				} | null;
		  }
		| undefined;
	let error: { message: string } | null = null;

	try {
		const result = await supabase.auth.signUp({
			email: data.email,
			password: data.password,
		});

		authData = result.data as typeof authData;
		error = result.error;
	} catch (err) {
		throw normalizeAuthError(err);
	}

	if (error || !authData) {
		throw new Error(error?.message || "Registration failed");
	}

	const authUser = authData.user;
	if (!authUser) {
		throw new Error("Registration failed");
	}

	const { error: profileError } = await supabase.from("profiles").upsert({
		id: authUser.id,
		name: data.name,
		email: data.email,
		created_at: authUser.created_at,
	});

	if (profileError) {
		throw normalizeAuthError(new Error(profileError.message));
	}

	return mapSupabaseUserToAppUser(authUser, data.name);
}

/**
 * Authenticate user (login)
 */
export async function authenticateUser(data: LoginInput): Promise<User> {
	let authData:
		| {
				user: {
					id: string;
					email?: string | null;
					created_at?: string;
				} | null;
		  }
		| undefined;
	let error: { message: string } | null = null;

	try {
		const result = await supabase.auth.signInWithPassword({
			email: data.email,
			password: data.password,
		});

		authData = result.data as typeof authData;
		error = result.error;
	} catch (err) {
		throw normalizeAuthError(err);
	}

	if (error || !authData || !authData.user) {
		throw normalizeAuthError(
			new Error(error?.message || "Invalid email or password"),
		);
	}

	const { data: profileData } = await supabase
		.from("profiles")
		.select("name")
		.eq("id", authData.user.id)
		.single();

	return mapSupabaseUserToAppUser(authData.user, profileData?.name);
}

/**
 * Get current logged-in user
 */
export async function getCurrentUser(): Promise<User | null> {
	const { data: authData } = await supabase.auth.getUser();
	if (!authData.user) return null;

	const { data: profileData } = await supabase
		.from("profiles")
		.select("name")
		.eq("id", authData.user.id)
		.single();

	return mapSupabaseUserToAppUser(authData.user, profileData?.name);
}

/**
 * Set current user (after login)
 */
export function setCurrentUser(_user: User): void {
	// Session is managed by Supabase auth.
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
	const { error } = await supabase.auth.signOut();
	if (error) {
		throw new Error(error.message);
	}
}

