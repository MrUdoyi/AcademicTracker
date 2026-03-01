import { describe, expect, test } from "bun:test";
import { calculateRequiredExamScore } from "../utils/grade-prediction";

describe("calculateRequiredExamScore", () => {
	test("returns required score when target is achievable", () => {
		const result = calculateRequiredExamScore({
			targetGrade: "A",
			currentScore: 18,
			maxExamScore: 70,
			gradingScale: [
				{ grade: "A", minScore: 70, weight: 5 },
				{ grade: "B", minScore: 60, weight: 4 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(true);
		expect(result.requiredExamScore).toBe(52);
		expect(result.suggestion).toBeNull();
	});

	test("returns fallback suggestion when target is not achievable", () => {
		const result = calculateRequiredExamScore({
			targetGrade: "A",
			currentScore: 5,
			maxExamScore: 40,
			gradingScale: [
				{ grade: "A", minScore: 70, weight: 5 },
				{ grade: "B", minScore: 60, weight: 4 },
				{ grade: "C", minScore: 50, weight: 3 },
				{ grade: "D", minScore: 45, weight: 2 },
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
			currentScore: 10,
			maxExamScore: 70,
		});

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});
