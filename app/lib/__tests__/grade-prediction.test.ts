import { describe, expect, test } from "bun:test";
import { calculateRequiredExamScore } from "../utils/grade-prediction";

describe("calculateRequiredExamScore", () => {
	test("returns required score when target is achievable", () => {
		const result = calculateRequiredExamScore({
			targetGrade: "A",
			targetGradeThreshold: 70,
			currentScore: 18,
			maxExamScore: 70,
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(true);
		expect(result.requiredExamScore).toBe(52);
		expect(result.suggestion).toBeNull();
	});

	test("returns fallback suggestion when target is not achievable", () => {
		const result = calculateRequiredExamScore({
			targetGrade: "A",
			targetGradeThreshold: 70,
			currentScore: 5,
			maxExamScore: 40,
			gradeThresholds: [
				{ grade: "A", threshold: 70 },
				{ grade: "B", threshold: 60 },
				{ grade: "C", threshold: 50 },
				{ grade: "D", threshold: 45 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(false);
		expect(result.requiredExamScore).toBe(65);
		expect(result.shortfall).toBe(25);
		expect(result.suggestion).toEqual({
			grade: "D",
			threshold: 45,
			requiredExamScore: 40,
		});
	});

	test("returns validation error for invalid inputs", () => {
		const result = calculateRequiredExamScore({
			targetGrade: "",
			targetGradeThreshold: 70,
			currentScore: 10,
			maxExamScore: 70,
		});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
