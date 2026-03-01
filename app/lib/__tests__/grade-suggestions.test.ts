import { describe, expect, test } from "bun:test";
import { suggestCourseGrades } from "../utils/grade-suggestions";

describe("suggestCourseGrades", () => {
	test("returns achievable distribution for moderate required GPA", () => {
		const result = suggestCourseGrades({
			requiredSemesterGPA: 4.2,
			inProgressCourses: [
				{ id: "1", courseCode: "CSC401", units: 4 },
				{ id: "2", courseCode: "MTH401", units: 3 },
				{ id: "3", courseCode: "PHY401", units: 2 },
			],
			gradingScale: [
				{ grade: "A", minScore: 70, weight: 5 },
				{ grade: "B+", minScore: 65, weight: 4.5 },
				{ grade: "B", minScore: 60, weight: 4 },
				{ grade: "C", minScore: 50, weight: 3 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(true);
		expect(result.projectedSemesterGPA).toBeGreaterThanOrEqual(4.2);
		expect(result.suggestions?.length).toBe(3);
	});

	test("upgrades higher-credit courses first for decimal target", () => {
		const result = suggestCourseGrades({
			requiredSemesterGPA: 4.2,
			inProgressCourses: [
				{ id: "1", courseCode: "BIG", units: 5 },
				{ id: "2", courseCode: "SMALL", units: 2 },
			],
			gradingScale: [
				{ grade: "A", minScore: 70, weight: 5 },
				{ grade: "B", minScore: 60, weight: 4 },
				{ grade: "C", minScore: 50, weight: 3 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(true);
		expect(result.projectedSemesterGPA).toBeGreaterThanOrEqual(4.2);

		const bigCourse = result.suggestions?.find((item) => item.courseCode === "BIG");
		const smallCourse = result.suggestions?.find(
			(item) => item.courseCode === "SMALL",
		);
		expect(bigCourse?.targetGradeWeight).toBeGreaterThanOrEqual(
			smallCourse?.targetGradeWeight ?? 0,
		);
	});

	test("returns impossible target when required GPA exceeds max scale", () => {
		const result = suggestCourseGrades({
			requiredSemesterGPA: 4.5,
			inProgressCourses: [
				{ id: "1", courseCode: "BIO301", units: 3 },
				{ id: "2", courseCode: "CHE301", units: 3 },
			],
			gradingScale: [
				{ grade: "A", minScore: 80, weight: 4 },
				{ grade: "B", minScore: 70, weight: 3 },
				{ grade: "C", minScore: 60, weight: 2 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(false);
		expect(result.maxPossibleSemesterGPA).toBe(4);
		expect(result.projectedSemesterGPA).toBe(4);
		expect(result.suggestions?.every((item) => item.targetGrade === "A")).toBe(true);
	});
});
