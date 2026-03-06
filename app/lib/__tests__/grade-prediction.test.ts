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

	test("uses sorted .find score lookup for fallback suggestion", () => {
		const result = calculateRequiredExamScore({
			targetGrade: "A",
			currentScore: 10,
			maxExamScore: 40,
			gradingScale: [
				{ grade: "C", minScore: 40, weight: 2 },
				{ grade: "A", minScore: 80, weight: 4 },
				{ grade: "D", minScore: 20, weight: 1 },
				{ grade: "B", minScore: 60, weight: 3 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(false);
		expect(result.requiredExamScore).toBe(70);
		expect(result.shortfall).toBe(30);
		expect(result.suggestion).toEqual({
			grade: "C",
			threshold: 40,
			requiredExamScore: 30,
		});
	});

	test("treats exact threshold as achievable tier with >= lookup", () => {
		const result = calculateRequiredExamScore({
			targetGrade: "A",
			currentScore: 35,
			maxExamScore: 25,
			gradingScale: [
				{ grade: "C", minScore: 40, weight: 2 },
				{ grade: "A", minScore: 80, weight: 4 },
				{ grade: "D", minScore: 20, weight: 1 },
				{ grade: "B", minScore: 60, weight: 3 },
			],
		});

		expect(result.success).toBe(true);
		expect(result.isTargetAchievable).toBe(false);
		expect(result.requiredExamScore).toBe(45);
		expect(result.suggestion).toEqual({
			grade: "B",
			threshold: 60,
			requiredExamScore: 25,
		});
	});
});
