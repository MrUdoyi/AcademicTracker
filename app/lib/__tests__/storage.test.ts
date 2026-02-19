import { beforeEach, describe, expect, test } from "bun:test";
import {
	createCourse,
	deleteCourse,
	getCourseById,
	getCoursesBySemester,
	getUserCourses,
	updateCourse,
} from "../storage/course";
import {
	authenticateUser,
	createUser,
	getCurrentUser,
	getUserByEmail,
	getUserById,
	logout,
	setCurrentUser,
} from "../storage/user";
import {
	getCachedAiInsights,
	saveCachedAiInsights,
} from "../storage/insights";
import {
	enqueuePendingAction,
	getPendingActions,
	markPendingActionAttempt,
	removePendingAction,
} from "../storage/queue";

const isBrowser =
	typeof window !== "undefined" && typeof localStorage !== "undefined";

beforeEach(() => {
	if (isBrowser) {
		localStorage.clear();
	}
});

describe.skipIf(!isBrowser)("User Storage", () => {
	const mockRegisterData = {
		name: "Test User",
		email: "test@example.com",
		password: "password123",
		confirmPassword: "password123",
	};

	test("createUser creates a new user", () => {
		const user = createUser(mockRegisterData);
		expect(user).toBeDefined();
		expect(user.email).toBe(mockRegisterData.email);
		expect(user.name).toBe(mockRegisterData.name);
		expect(user.id).toBeDefined();
	});

	test("createUser throws error for duplicate email", () => {
		createUser(mockRegisterData);
		expect(() => createUser(mockRegisterData)).toThrow(
			"User with this email already exists",
		);
	});

	test("getUserByEmail returns user", () => {
		const createdUser = createUser(mockRegisterData);
		const foundUser = getUserByEmail(mockRegisterData.email);
		expect(foundUser).toBeDefined();
		expect(foundUser?.id).toBe(createdUser.id);
	});

	test("getUserById returns user", () => {
		const createdUser = createUser(mockRegisterData);
		const foundUser = getUserById(createdUser.id);
		expect(foundUser).toBeDefined();
		expect(foundUser?.email).toBe(mockRegisterData.email);
	});

	test("authenticateUser succeeds with valid credentials", () => {
		createUser(mockRegisterData);
		const user = authenticateUser({
			email: mockRegisterData.email,
			password: mockRegisterData.password,
		});
		expect(user).toBeDefined();
		expect(user.email).toBe(mockRegisterData.email);
	});

	test("authenticateUser throws error for invalid email", () => {
		expect(() =>
			authenticateUser({
				email: "nonexistent@example.com",
				password: "password123",
			}),
		).toThrow("Invalid email or password");
	});

	test("authenticateUser throws error for invalid password", () => {
		createUser(mockRegisterData);
		expect(() =>
			authenticateUser({
				email: mockRegisterData.email,
				password: "wrongpassword",
			}),
		).toThrow("Invalid email or password");
	});

	test("setCurrentUser and getCurrentUser work together", () => {
		const user = createUser(mockRegisterData);
		setCurrentUser(user);
		const currentUser = getCurrentUser();
		expect(currentUser).toBeDefined();
		expect(currentUser?.id).toBe(user.id);
	});

	test("logout removes current user", () => {
		const user = createUser(mockRegisterData);
		setCurrentUser(user);
		logout();
		const currentUser = getCurrentUser();
		expect(currentUser).toBeNull();
	});
});

describe.skipIf(!isBrowser)("Course Storage", () => {
	let testUserId: string;

	beforeEach(() => {
		const user = createUser({
			name: "Test User",
			email: "test@example.com",
			password: "password123",
			confirmPassword: "password123",
		});
		testUserId = user.id;
	});

	const mockCourseData = {
		courseCode: "CS101",
		title: "Intro to Computer Science",
		units: 3,
		grade: "A" as const,
		semester: "First" as const,
		year: 2023,
		status: "completed" as const,
	};

	test("createCourse creates a new course", () => {
		const course = createCourse(testUserId, mockCourseData);
		expect(course).toBeDefined();
		expect(course.courseCode).toBe(mockCourseData.courseCode);
		expect(course.userId).toBe(testUserId);
		expect(course.id).toBeDefined();
	});

	test("createCourse throws error for duplicate course code", () => {
		createCourse(testUserId, mockCourseData);
		expect(() => createCourse(testUserId, mockCourseData)).toThrow(
			"Course with this code already exists",
		);
	});

	test("getUserCourses returns user's courses", () => {
		createCourse(testUserId, mockCourseData);
		createCourse(testUserId, { ...mockCourseData, courseCode: "CS102" });
		const courses = getUserCourses(testUserId);
		expect(courses).toHaveLength(2);
	});

	test("getCourseById returns course", () => {
		const createdCourse = createCourse(testUserId, mockCourseData);
		const foundCourse = getCourseById(createdCourse.id);
		expect(foundCourse).toBeDefined();
		expect(foundCourse?.courseCode).toBe(mockCourseData.courseCode);
	});

	test("updateCourse updates course data", () => {
		const course = createCourse(testUserId, mockCourseData);
		const updated = updateCourse(course.id, {
			grade: "B",
		});
		expect(updated.grade).toBe("B");
		expect(updated.courseCode).toBe(mockCourseData.courseCode);
	});

	test("updateCourse throws error for non-existent course", () => {
		expect(() => updateCourse("nonexistent-id", { grade: "A" })).toThrow(
			"Course not found",
		);
	});

	test("deleteCourse removes course", () => {
		const course = createCourse(testUserId, mockCourseData);
		deleteCourse(course.id);
		const foundCourse = getCourseById(course.id);
		expect(foundCourse).toBeNull();
	});

	test("deleteCourse throws error for non-existent course", () => {
		expect(() => deleteCourse("nonexistent-id")).toThrow("Course not found");
	});

	test("getCoursesBySemester groups courses correctly", () => {
		createCourse(testUserId, mockCourseData);
		createCourse(testUserId, {
			...mockCourseData,
			courseCode: "CS102",
			semester: "Second" as const,
			year: 2024,
		});
		const grouped = getCoursesBySemester(testUserId);
		expect(Object.keys(grouped)).toHaveLength(2);
		expect(grouped["First 2023"]).toHaveLength(1);
		expect(grouped["Second 2024"]).toHaveLength(1);
	});
});

describe.skipIf(!isBrowser)("AI Insights Cache Storage", () => {
	test("saveCachedAiInsights and getCachedAiInsights work together", () => {
		const user = createUser({
			name: "Insights User",
			email: "insights@example.com",
			password: "password123",
			confirmPassword: "password123",
		});

		const initialInsights = [
			"1. Great progress in core courses",
			"2. Keep balancing theory and practical courses",
		];

		saveCachedAiInsights(user.id, initialInsights);

		const cached = getCachedAiInsights(user.id);

		expect(cached).toBeDefined();
		expect(cached?.userId).toBe(user.id);
		expect(cached?.insights).toEqual(initialInsights);
		expect(cached?.generatedAt).toBeDefined();
	});

	test("saveCachedAiInsights updates existing user cache", () => {
		const user = createUser({
			name: "Update Cache User",
			email: "cache-update@example.com",
			password: "password123",
			confirmPassword: "password123",
		});

		saveCachedAiInsights(user.id, ["1. Initial insight"]);
		saveCachedAiInsights(user.id, [
			"1. Updated insight",
			"2. Another updated insight",
		]);

		const cached = getCachedAiInsights(user.id);

		expect(cached?.insights).toEqual([
			"1. Updated insight",
			"2. Another updated insight",
		]);
	});

	test("getCachedAiInsights returns null for unknown user", () => {
		const cached = getCachedAiInsights("missing-user-id");
		expect(cached).toBeNull();
	});
});

describe.skipIf(!isBrowser)("Pending Actions Queue Storage", () => {
	test("enqueuePendingAction stores action", () => {
		const action = enqueuePendingAction(
			"refresh-ai-insights",
			{ userId: "user-1" },
			{ dedupeByPayload: true },
		);

		expect(action).toBeDefined();
		expect(action.type).toBe("refresh-ai-insights");
		expect(action.attempts).toBe(0);

		const actions = getPendingActions("refresh-ai-insights");
		expect(actions).toHaveLength(1);
		expect(actions[0].payload).toEqual({ userId: "user-1" });
	});

	test("dedupeByPayload prevents duplicates", () => {
		enqueuePendingAction(
			"refresh-ai-insights",
			{ userId: "user-1" },
			{ dedupeByPayload: true },
		);
		enqueuePendingAction(
			"refresh-ai-insights",
			{ userId: "user-1" },
			{ dedupeByPayload: true },
		);

		expect(getPendingActions("refresh-ai-insights")).toHaveLength(1);
	});

	test("markPendingActionAttempt increments attempts and stores error", () => {
		const action = enqueuePendingAction("refresh-ai-insights", {
			userId: "user-2",
		});

		markPendingActionAttempt(action.id, "Network timeout");

		const updated = getPendingActions().find((item) => item.id === action.id);
		expect(updated?.attempts).toBe(1);
		expect(updated?.lastError).toBe("Network timeout");
	});

	test("removePendingAction deletes queued action", () => {
		const action = enqueuePendingAction("refresh-ai-insights", {
			userId: "user-3",
		});

		removePendingAction(action.id);

		expect(getPendingActions().find((item) => item.id === action.id)).toBe(
			undefined,
		);
	});
});
