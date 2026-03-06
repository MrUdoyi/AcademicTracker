import { describe, expect, test } from "bun:test";
import type { Course } from "../schemas/course";
import { generatePersonalizedInsights } from "../utils/recommendations";

function createInProgressCourse(overrides: Partial<Course>): Course {
	return {
		id: "course-1",
		userId: "user-1",
		courseCode: "CSC401",
		title: "Software Engineering",
		units: 3,
		semester: "First",
		year: 2026,
		status: "in-progress",
		createdAt: "2026-01-01",
		updatedAt: "2026-01-01",
		...overrides,
	};
}

describe("generatePersonalizedInsights", () => {
	test("uses sorted score-tier lookup for boundary insights with unsorted scale", () => {
		const inProgressCourses: Course[] = [
			createInProgressCourse({
				id: "csc-401",
				courseCode: "CSC401",
				units: 4,
				currentScore: 77,
			}),
		];

		const insights = generatePersonalizedInsights({
			inProgressCourses,
			targetCGPA: 4.2,
			gradingScale: [
				{ grade: "C", minScore: 50, weight: 2 },
				{ grade: "A", minScore: 80, weight: 4 },
				{ grade: "D", minScore: 40, weight: 1 },
				{ grade: "B", minScore: 60, weight: 3 },
			],
		});

		expect(insights.length).toBeGreaterThan(0);
		expect(insights[0]).toContain("3.00 marks away");
		expect(insights[0]).toContain("'A'");
		expect(insights[0]).toContain("CSC401");
	});

	test("falls back to highest leverage course when no close boundary is found", () => {
		const inProgressCourses: Course[] = [
			createInProgressCourse({
				id: "mth-401",
				courseCode: "MTH401",
				units: 5,
				currentScore: 62,
			}),
			createInProgressCourse({
				id: "phy-401",
				courseCode: "PHY401",
				units: 2,
				currentScore: 41,
			}),
		];

		const insights = generatePersonalizedInsights({
			inProgressCourses,
			targetCGPA: 4.0,
			gradingScale: [
				{ grade: "A", minScore: 90, weight: 5 },
				{ grade: "B", minScore: 70, weight: 4 },
				{ grade: "C", minScore: 50, weight: 3 },
				{ grade: "D", minScore: 40, weight: 2 },
			],
		});

		expect(insights.length).toBeGreaterThan(0);
		expect(insights[0]).toContain("MTH401");
		expect(insights[0]).toContain("highest weight");
	});
});
