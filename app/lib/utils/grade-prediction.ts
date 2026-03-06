import {
	normalizeGradingScale,
	type GradingScale,
} from "../schemas/grading-scale";

export interface CalculateRequiredExamScoreInput {
	targetGrade: string;
	currentScore: number;
	maxExamScore: number;
	gradingScale?: GradingScale | null;
}

export interface AchievableGradeSuggestion {
	grade: string;
	threshold: number;
	requiredExamScore: number;
}

export interface CalculateRequiredExamScoreResult {
	success: boolean;
	targetGrade?: string;
	requiredExamScore?: number;
	isTargetAchievable?: boolean;
	shortfall?: number;
	suggestion?: AchievableGradeSuggestion | null;
	error?: string;
}

/**
 * Calculates the exam score required to reach a target grade threshold for an in-progress course.
 * If the target is not achievable within maxExamScore, returns the highest achievable lower-grade suggestion.
 */
export function calculateRequiredExamScore(
	input: CalculateRequiredExamScoreInput,
): CalculateRequiredExamScoreResult {
	try {
		const {
			targetGrade,
			currentScore,
			maxExamScore,
			gradingScale,
		} = input;

		const sortedScale = normalizeGradingScale(gradingScale);
		const targetItem = sortedScale.find((item) => item.grade === targetGrade);
		const targetGradeThreshold = targetItem?.minScore;

		if (!targetGrade || targetGrade.trim().length === 0) {
			return { success: false, error: "Target grade is required." };
		}

		if (
			targetGradeThreshold === undefined ||
			!Number.isFinite(targetGradeThreshold) ||
			targetGradeThreshold < 0
		) {
			return {
				success: false,
				error: "Target grade does not exist in the grading scale.",
			};
		}

		if (!Number.isFinite(currentScore) || currentScore < 0) {
			return {
				success: false,
				error: "Current score must be a non-negative number.",
			};
		}

		if (!Number.isFinite(maxExamScore) || maxExamScore <= 0) {
			return {
				success: false,
				error: "Max exam score must be greater than 0.",
			};
		}

		const requiredRaw = targetGradeThreshold - currentScore;
		const requiredExamScore = Math.max(0, Number(requiredRaw.toFixed(2)));

		if (requiredExamScore <= maxExamScore) {
			return {
				success: true,
				targetGrade,
				requiredExamScore,
				isTargetAchievable: true,
				shortfall: 0,
				suggestion: null,
			};
		}

		const shortfall = Number((requiredExamScore - maxExamScore).toFixed(2));
		const achievableTotal = currentScore + maxExamScore;
		const achievableTier = sortedScale.find(
			(tier) => achievableTotal >= tier.minScore,
		);

		const suggestion =
			achievableTier && achievableTier.minScore < targetGradeThreshold
			? {
					grade: achievableTier.grade,
					threshold: achievableTier.minScore,
					requiredExamScore: Number(
						Math.max(0, achievableTier.minScore - currentScore).toFixed(2),
					),
			  }
			: null;

		return {
			success: true,
			targetGrade,
			requiredExamScore,
			isTargetAchievable: false,
			shortfall,
			suggestion,
		};
	} catch {
		return {
			success: false,
			error: "Unable to calculate required exam score.",
		};
	}
}
