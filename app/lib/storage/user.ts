import type { LoginInput, RegisterInput, User } from "../schemas/user";
import {
	normalizeGradingScale,
	type GradingScale,
	type GradingScaleItem,
} from "../schemas/grading-scale";
import { supabase } from "../supabase/client";

export interface AcademicBaseValues {
	baseCgpa: number;
	baseTotalCredits: number;
}

export const DEFAULT_TOTAL_DEGREE_CREDITS = 120;
export const DEFAULT_CURRENT_LEVEL = 100;
export const DEFAULT_CURRENT_SEMESTER: "First" | "Second" | "Summer" = "First";

function parseGradingScale(value: unknown): GradingScale | null {
	if (!Array.isArray(value)) return null;

	const items: GradingScaleItem[] = value
		.filter((entry): entry is Record<string, unknown> =>
			typeof entry === "object" && entry !== null,
		)
		.map((entry) => ({
			grade: String(entry.grade ?? "").trim(),
			minScore: Number(entry.minScore),
			weight: Number(entry.weight),
		}))
		.filter(
			(item) =>
				item.grade.length > 0 &&
				Number.isFinite(item.minScore) &&
				Number.isFinite(item.weight),
		);

	if (items.length === 0) return null;
	return normalizeGradingScale(items);
}

function isProfilesRlsError(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("row-level security") && normalized.includes("profiles")
	);
}

async function upsertProfileSafe(user: {
	id: string;
	email?: string | null;
	created_at?: string;
}, name: string): Promise<void> {
	const { error } = await supabase.from("profiles").upsert({
		id: user.id,
		name,
		email: user.email || "",
		created_at: user.created_at,
	});

	if (!error) return;

	if (isProfilesRlsError(error.message)) {
		return;
	}

	throw normalizeAuthError(new Error(error.message));
}

async function ensureProfileForUser(userId: string): Promise<void> {
	const { data: profileData } = await supabase
		.from("profiles")
		.select("id")
		.eq("id", userId)
		.maybeSingle();

	if (profileData) return;

	const { data: authData } = await supabase.auth.getUser();
	if (!authData.user || authData.user.id !== userId) return;

	await upsertProfileSafe(
		{
			id: authData.user.id,
			email: authData.user.email,
			created_at: authData.user.created_at,
		},
		authData.user.email?.split("@")[0] || "Student",
	);
}

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
		totalDegreeCredits: DEFAULT_TOTAL_DEGREE_CREDITS,
		currentLevel: DEFAULT_CURRENT_LEVEL,
		currentSemester: DEFAULT_CURRENT_SEMESTER,
		hasSeenOnboarding: false,
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

	await upsertProfileSafe(authUser, data.name);

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

	await upsertProfileSafe(
		authData.user,
		authData.user.email?.split("@")[0] || "Student",
	);

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

/**
 * Get user's target GPA
 */
export async function getUserTargetGpa(userId: string): Promise<number | null> {
	await ensureProfileForUser(userId);

	const { data, error } = await supabase
		.from("profiles")
		.select("target_gpa")
		.eq("id", userId)
		.maybeSingle();

	if (error || !data) return null;

	const value = data.target_gpa;
	return typeof value === "number" ? value : null;
}

/**
 * Set or clear user's target GPA
 */
export async function setUserTargetGpa(
	userId: string,
	targetGpa: number | null,
): Promise<void> {
	await ensureProfileForUser(userId);

	const { error } = await supabase
		.from("profiles")
		.update({ target_gpa: targetGpa })
		.eq("id", userId);

	if (error) {
		throw new Error(error.message);
	}
}

/**
 * Get user's quick-start academic base values
 */
export async function getUserAcademicBase(
	userId: string,
): Promise<AcademicBaseValues | null> {
	await ensureProfileForUser(userId);

	const { data, error } = await supabase
		.from("profiles")
		.select("base_cgpa, base_total_credits")
		.eq("id", userId)
		.maybeSingle();

	if (error || !data) return null;

	const baseCgpa = data.base_cgpa;
	const baseTotalCredits = data.base_total_credits;

	if (typeof baseCgpa !== "number" || typeof baseTotalCredits !== "number") {
		return null;
	}

	return {
		baseCgpa,
		baseTotalCredits,
	};
}

/**
 * Set or clear user's quick-start academic base values
 */
export async function setUserAcademicBase(
	userId: string,
	base: AcademicBaseValues | null,
): Promise<void> {
	await ensureProfileForUser(userId);

	const payload = base
		? {
				base_cgpa: Number(base.baseCgpa.toFixed(2)),
				base_total_credits: Math.max(0, Math.trunc(base.baseTotalCredits)),
		  }
		: {
				base_cgpa: null,
				base_total_credits: null,
		  };

	const { error } = await supabase
		.from("profiles")
		.update(payload)
		.eq("id", userId);

	if (error) {
		throw new Error(error.message);
	}
}

export async function getUserGradingScale(
	userId: string,
): Promise<GradingScale | null> {
	await ensureProfileForUser(userId);

	const { data, error } = await supabase
		.from("profiles")
		.select("grading_scale")
		.eq("id", userId)
		.maybeSingle();

	if (error || !data) return null;

	return parseGradingScale(data.grading_scale);
}

export async function setUserGradingScale(
	userId: string,
	gradingScale: GradingScale | null,
): Promise<void> {
	await ensureProfileForUser(userId);

	const payload = {
		grading_scale: gradingScale ? normalizeGradingScale(gradingScale) : null,
	};

	const { error } = await supabase
		.from("profiles")
		.update(payload)
		.eq("id", userId);

	if (error) {
		throw new Error(error.message);
	}
}

export async function getUserTotalDegreeCredits(userId: string): Promise<number> {
	await ensureProfileForUser(userId);

	const { data, error } = await supabase
		.from("profiles")
		.select("total_degree_credits")
		.eq("id", userId)
		.maybeSingle();

	if (error || !data) return DEFAULT_TOTAL_DEGREE_CREDITS;

	const value = data.total_degree_credits;
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value <= 0 ||
		!Number.isInteger(value)
	) {
		return DEFAULT_TOTAL_DEGREE_CREDITS;
	}

	return value;
}

export async function setUserTotalDegreeCredits(
	userId: string,
	totalDegreeCredits: number,
): Promise<void> {
	await ensureProfileForUser(userId);

	if (
		!Number.isFinite(totalDegreeCredits) ||
		totalDegreeCredits <= 0 ||
		!Number.isInteger(totalDegreeCredits)
	) {
		throw new Error("Expected Total Degree Credits must be a whole number greater than 0.");
	}

	const { error } = await supabase
		.from("profiles")
		.update({ total_degree_credits: totalDegreeCredits })
		.eq("id", userId);

	if (error) {
		throw new Error(error.message);
	}
}

export interface CurrentAcademicContext {
	currentLevel: number;
	currentSemester: "First" | "Second" | "Summer";
}

function normalizeCurrentLevel(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return DEFAULT_CURRENT_LEVEL;
	}

	const normalized = Math.trunc(value);
	if (normalized < 100 || normalized > 900) {
		return DEFAULT_CURRENT_LEVEL;
	}

	return normalized;
}

function normalizeCurrentSemester(value: unknown): "First" | "Second" | "Summer" {
	if (value === "First" || value === "Second" || value === "Summer") {
		return value;
	}
	return DEFAULT_CURRENT_SEMESTER;
}

export async function getUserCurrentAcademicContext(
	userId: string,
): Promise<CurrentAcademicContext> {
	await ensureProfileForUser(userId);

	const { data, error } = await supabase
		.from("profiles")
		.select("current_level, current_semester")
		.eq("id", userId)
		.maybeSingle();

	if (error || !data) {
		return {
			currentLevel: DEFAULT_CURRENT_LEVEL,
			currentSemester: DEFAULT_CURRENT_SEMESTER,
		};
	}

	return {
		currentLevel: normalizeCurrentLevel(data.current_level),
		currentSemester: normalizeCurrentSemester(data.current_semester),
	};
}

export async function setUserCurrentAcademicContext(
	userId: string,
	context: CurrentAcademicContext,
): Promise<void> {
	await ensureProfileForUser(userId);

	const normalizedLevel = normalizeCurrentLevel(context.currentLevel);
	const normalizedSemester = normalizeCurrentSemester(context.currentSemester);

	const { error } = await supabase
		.from("profiles")
		.update({
			current_level: normalizedLevel,
			current_semester: normalizedSemester,
		})
		.eq("id", userId);

	if (error) {
		throw new Error(error.message);
	}
}

export async function getUserHasSeenOnboarding(userId: string): Promise<boolean> {
	await ensureProfileForUser(userId);

	const { data, error } = await supabase
		.from("profiles")
		.select("has_seen_onboarding")
		.eq("id", userId)
		.maybeSingle();

	if (error || !data) return false;

	return data.has_seen_onboarding === true;
}

export async function setUserHasSeenOnboarding(
	userId: string,
	hasSeenOnboarding: boolean,
): Promise<void> {
	await ensureProfileForUser(userId);

	const { error } = await supabase
		.from("profiles")
		.update({ has_seen_onboarding: hasSeenOnboarding })
		.eq("id", userId);

	if (error) {
		throw new Error(error.message);
	}
}

