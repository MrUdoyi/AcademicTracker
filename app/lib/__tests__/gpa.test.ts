import { describe, expect, test } from "bun:test";
import type { Course } from "../schemas/course";
import {
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

	test("uses default total credits", () => {
		expect(calculateDegreeProgress(60)).toBe(50);
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
