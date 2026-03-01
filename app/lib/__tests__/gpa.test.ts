import { describe, expect, test } from "bun:test";
import type { Course } from "../schemas/course";
import {
	calculateMaxAchievableCGPA,
	calculateRequiredSemesterGPA,
	calculateCGPA,
	calculateDegreeProgress,
	calculateGPA,
	calculateSemesterGPA,
	generateInsights,
	getCoursesInProgress,
	getSemesterPerformance,
	getTotalCoursesCompleted,
	getTotalCredits,
	gradeToPoints,
} from "../utils/gpa";

const mockCourses: Course[] = [
	{
		id: "1",
		userId: "user1",
		courseCode: "CS101",
		title: "Intro to CS",
		units: 3,
		grade: "A",
		semester: "First",
		year: 2023,
		status: "completed",
		createdAt: "2023-01-01",
		updatedAt: "2023-01-01",
	},
	{
		id: "2",
		userId: "user1",
		courseCode: "MATH101",
		title: "Calculus",
		units: 4,
		grade: "B",
		semester: "First",
		year: 2023,
		status: "completed",
		createdAt: "2023-01-01",
		updatedAt: "2023-01-01",
	},
	{
		id: "3",
		userId: "user1",
		courseCode: "ENG101",
		title: "English",
		units: 3,
		grade: undefined,
		semester: "Second",
		year: 2024,
		status: "in-progress",
		createdAt: "2023-01-01",
		updatedAt: "2023-01-01",
	},
];

describe("gradeToPoints", () => {
	test("converts A to 5.0", () => {
		expect(gradeToPoints("A")).toBe(5.0);
	});

	test("converts B+ to 4.5", () => {
		expect(gradeToPoints("B+")).toBe(4.5);
	});

	test("converts F to 0.0", () => {
		expect(gradeToPoints("F")).toBe(0.0);
	});
});

describe("calculateMaxAchievableCGPA", () => {
	test("calculates max achievable CGPA from remaining credits", () => {
		const result = calculateMaxAchievableCGPA({
			pastCGPA: 3.2,
			pastTotalCredits: 80,
			totalDegreeCredits: 150,
			gradingScale: [
				{ grade: "A", minScore: 70, weight: 5 },
				{ grade: "B", minScore: 60, weight: 4 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.remainingCredits).toBe(70);
		expect(result.maxPossibleSemesterGPA).toBe(5);
		expect(result.maxAchievableCGPA).toBe(4.04);
	});

	test("returns current outcome when no remaining credits", () => {
		const result = calculateMaxAchievableCGPA({
			pastCGPA: 3.75,
			pastTotalCredits: 120,
			totalDegreeCredits: 120,
		});

		expect(result.success).toBe(true);
		expect(result.remainingCredits).toBe(0);
		expect(result.maxAchievableCGPA).toBe(3.75);
	});

	test("returns validation error for invalid total degree credits", () => {
		const result = calculateMaxAchievableCGPA({
			pastCGPA: 3,
			pastTotalCredits: 60,
			totalDegreeCredits: 0,
		});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

describe("calculateGPA", () => {
	test("calculates GPA correctly for completed courses", () => {
		const gpa = calculateGPA(mockCourses);
		const expected = (5.0 * 3 + 4.0 * 4) / (3 + 4);
		expect(gpa).toBeCloseTo(expected, 2);
	});

	test("returns 0 for empty array", () => {
		expect(calculateGPA([])).toBe(0);
	});

	test("ignores in-progress courses", () => {
		const gpa = calculateGPA(mockCourses);
		const completedOnly = mockCourses.filter((c) => c.status === "completed");
		expect(calculateGPA(completedOnly)).toBe(gpa);
	});
});

describe("calculateSemesterGPA", () => {
	test("calculates GPA for specific semester", () => {
		const gpa = calculateSemesterGPA(mockCourses, "First", 2023);
		const expected = (5.0 * 3 + 4.0 * 4) / (3 + 4);
		expect(gpa).toBeCloseTo(expected, 2);
	});

	test("returns 0 for semester with no courses", () => {
		expect(calculateSemesterGPA(mockCourses, "Summer", 2023)).toBe(0);
	});
});

describe("calculateCGPA", () => {
	test("calculates cumulative GPA", () => {
		const cgpa = calculateCGPA(mockCourses);
		expect(cgpa).toBeGreaterThan(0);
		expect(cgpa).toBeLessThanOrEqual(5.0);
	});
});

describe("getTotalCredits", () => {
	test("sums units of completed courses", () => {
		const total = getTotalCredits(mockCourses);
		expect(total).toBe(7);
	});

	test("returns 0 for empty array", () => {
		expect(getTotalCredits([])).toBe(0);
	});
});

describe("getTotalCoursesCompleted", () => {
	test("counts completed courses", () => {
		expect(getTotalCoursesCompleted(mockCourses)).toBe(2);
	});

	test("returns 0 for empty array", () => {
		expect(getTotalCoursesCompleted([])).toBe(0);
	});
});

describe("getCoursesInProgress", () => {
	test("counts in-progress courses", () => {
		expect(getCoursesInProgress(mockCourses)).toBe(1);
	});

	test("returns 0 for empty array", () => {
		expect(getCoursesInProgress([])).toBe(0);
	});
});

describe("getSemesterPerformance", () => {
	test("groups courses by semester and calculates GPA", () => {
		const performance = getSemesterPerformance(mockCourses);
		expect(performance).toHaveLength(1);
		expect(performance[0].semester).toBe("First");
		expect(performance[0].year).toBe(2023);
		expect(performance[0].gpa).toBeGreaterThan(0);
	});

	test("returns empty array for no completed courses", () => {
		const inProgress = mockCourses.filter((c) => c.status === "in-progress");
		expect(getSemesterPerformance(inProgress)).toHaveLength(0);
	});
});

describe("calculateDegreeProgress", () => {
	test("calculates progress percentage", () => {
		expect(calculateDegreeProgress(30, 120)).toBe(25);
		expect(calculateDegreeProgress(60, 120)).toBe(50);
		expect(calculateDegreeProgress(120, 120)).toBe(100);
	});

	test("caps at 100%", () => {
		expect(calculateDegreeProgress(150, 120)).toBe(100);
	});

	test("returns 0 when total required credits is invalid", () => {
		expect(calculateDegreeProgress(60, 0)).toBe(0);
	});
});

describe("generateInsights", () => {
	test("generates insights for courses with high CGPA", () => {
		const highGpaCourses: Course[] = [
			...mockCourses,
			{
				id: "4",
				userId: "user1",
				courseCode: "CS102",
				title: "Data Structures",
				units: 3,
				grade: "A",
				semester: "Second",
				year: 2024,
				status: "completed",
				createdAt: "2024-01-01",
				updatedAt: "2024-01-01",
			},
		];
		const insights = generateInsights(highGpaCourses);
		expect(insights.length).toBeGreaterThan(0);
		expect(insights.some((i) => i.includes("performance"))).toBe(true);
	});

	test("returns empty array for no courses", () => {
		const insights = generateInsights([]);
		expect(insights).toHaveLength(0);
	});
});

describe("calculateRequiredSemesterGPA", () => {
	test("returns achievable required semester GPA", () => {
		const result = calculateRequiredSemesterGPA({
			targetCGPA: 4.2,
			pastCGPA: 4.0,
			pastTotalCredits: 60,
			currentSemesterCredits: 20,
			gradingScale: [
				{ grade: "A", minScore: 70, weight: 5 },
				{ grade: "B", minScore: 60, weight: 4 },
				{ grade: "C", minScore: 50, weight: 3 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(true);
		expect(result.requiredSemesterGPA).toBe(4.8);
		expect(result.maxPossibleSemesterGPA).toBe(5);
	});

	test("returns impossible result and max realistic CGPA", () => {
		const result = calculateRequiredSemesterGPA({
			targetCGPA: 4.8,
			pastCGPA: 3.0,
			pastTotalCredits: 90,
			currentSemesterCredits: 20,
			gradingScale: [
				{ grade: "A", minScore: 80, weight: 4 },
				{ grade: "B", minScore: 70, weight: 3 },
				{ grade: "C", minScore: 60, weight: 2 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(false);
		expect(result.requiredSemesterGPA).toBeGreaterThan(4);
		expect(result.maxPossibleSemesterGPA).toBe(4);
		expect(result.maxRealisticCGPA).toBe(3.18);
	});

	test("returns error when current semester credits are invalid", () => {
		const result = calculateRequiredSemesterGPA({
			targetCGPA: 4,
			pastCGPA: 3.5,
			pastTotalCredits: 30,
			currentSemesterCredits: 0,
		});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
