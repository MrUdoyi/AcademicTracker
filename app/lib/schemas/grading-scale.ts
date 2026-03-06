export interface GradingScaleItem {
	grade: string;
	minScore: number;
	weight: number;
}

export type GradingScale = GradingScaleItem[];

export const STANDARD_5_GRADING_SCALE: GradingScale = [
	{ grade: "A", minScore: 70, weight: 5 },
	{ grade: "B+", minScore: 65, weight: 4.5 },
	{ grade: "B", minScore: 60, weight: 4 },
	{ grade: "C+", minScore: 55, weight: 3.5 },
	{ grade: "C", minScore: 50, weight: 3 },
	{ grade: "D+", minScore: 45, weight: 2.5 },
	{ grade: "D", minScore: 40, weight: 2 },
	{ grade: "E", minScore: 35, weight: 1 },
	{ grade: "F", minScore: 0, weight: 0 },
];

export const STANDARD_4_GRADING_SCALE: GradingScale = [
	{ grade: "A", minScore: 80, weight: 4 },
	{ grade: "B+", minScore: 75, weight: 3.5 },
	{ grade: "B", minScore: 70, weight: 3 },
	{ grade: "C+", minScore: 65, weight: 2.5 },
	{ grade: "C", minScore: 60, weight: 2 },
	{ grade: "D+", minScore: 55, weight: 1.5 },
	{ grade: "D", minScore: 50, weight: 1 },
	{ grade: "E", minScore: 45, weight: 0.5 },
	{ grade: "F", minScore: 0, weight: 0 },
];

export const DEFAULT_GRADING_SCALE: GradingScale = STANDARD_5_GRADING_SCALE;

export function normalizeGradingScale(scale?: GradingScale | null): GradingScale {
	const source = scale && scale.length > 0 ? scale : DEFAULT_GRADING_SCALE;

	return [...source]
		.filter(
			(item) =>
				typeof item.grade === "string" &&
				item.grade.trim().length > 0 &&
				Number.isFinite(item.minScore) &&
				Number.isFinite(item.weight),
		)
		.map((item) => ({
			grade: item.grade.trim(),
			minScore: Number(item.minScore),
			weight: Number(item.weight),
		}))
		.sort((a, b) => b.minScore - a.minScore);
}

export function getScaleItemByGrade(
	grade: string,
	scale?: GradingScale | null,
): GradingScaleItem | undefined {
	const normalized = normalizeGradingScale(scale);
	return normalized.find((item) => item.grade === grade);
}
