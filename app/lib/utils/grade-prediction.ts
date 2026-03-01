export interface GradeThreshold {
	grade: string;
	threshold: number;
}

export interface CalculateRequiredExamScoreInput {
	targetGrade: string;
	targetGradeThreshold: number;
	currentScore: number;
	maxExamScore: number;
	gradeThresholds?: GradeThreshold[];
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

const DEFAULT_GRADE_THRESHOLDS: GradeThreshold[] = [
	{ grade: "A", threshold: 70 },
	{ grade: "B", threshold: 60 },
	{ grade: "C", threshold: 50 },
	{ grade: "D", threshold: 45 },
	{ grade: "E", threshold: 40 },
	{ grade: "F", threshold: 0 },
];

function normalizeThresholds(gradeThresholds?: GradeThreshold[]): GradeThreshold[] {
	const source = gradeThresholds && gradeThresholds.length > 0
		? gradeThresholds
		: DEFAULT_GRADE_THRESHOLDS;

	const filtered = source.filter((item) =>
		item.grade.trim().length > 0 && Number.isFinite(item.threshold),
	);

	return [...filtered].sort((a, b) => b.threshold - a.threshold);
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
			targetGradeThreshold,
			currentScore,
			maxExamScore,
			gradeThresholds,
		} = input;

		if (!targetGrade || targetGrade.trim().length === 0) {
			return { success: false, error: "Target grade is required." };
		}

		if (!Number.isFinite(targetGradeThreshold) || targetGradeThreshold < 0) {
			return {
				success: false,
				error: "Target grade threshold must be a non-negative number.",
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
		const thresholds = normalizeThresholds(gradeThresholds);
		const suggestionThreshold = thresholds.find(
			(item) =>
				item.threshold < targetGradeThreshold && item.threshold <= achievableTotal,
		);

		const suggestion = suggestionThreshold
			? {
					grade: suggestionThreshold.grade,
					threshold: suggestionThreshold.threshold,
					requiredExamScore: Number(
						Math.max(0, suggestionThreshold.threshold - currentScore).toFixed(2),
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
