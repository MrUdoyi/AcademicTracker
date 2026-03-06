export interface GradeTier {
	grade: string;
	points: number;
	minScore: number;
}

export type ScaleType = 4 | 5;
export type MinAScore = 70 | 80;

export function generateDefaultScale(
	scaleType: ScaleType,
	minA: MinAScore,
): GradeTier[] {
	if (scaleType === 5 && minA === 70) {
		return [
			{ grade: "A", points: 5, minScore: 70 },
			{ grade: "B", points: 4, minScore: 60 },
			{ grade: "C", points: 3, minScore: 50 },
			{ grade: "D", points: 2, minScore: 45 },
			{ grade: "E", points: 1, minScore: 40 },
			{ grade: "F", points: 0, minScore: 0 },
		];
	}

	if (scaleType === 5 && minA === 80) {
		return [
			{ grade: "A", points: 5, minScore: 80 },
			{ grade: "B", points: 4, minScore: 70 },
			{ grade: "C", points: 3, minScore: 60 },
			{ grade: "D", points: 2, minScore: 50 },
			{ grade: "E", points: 1, minScore: 40 },
			{ grade: "F", points: 0, minScore: 0 },
		];
	}

	if (scaleType === 4 && minA === 70) {
		return [
			{ grade: "A", points: 4, minScore: 70 },
			{ grade: "B", points: 3, minScore: 60 },
			{ grade: "C", points: 2, minScore: 50 },
			{ grade: "D", points: 1, minScore: 45 },
			{ grade: "F", points: 0, minScore: 0 },
		];
	}

	return [
		{ grade: "A", points: 4, minScore: 80 },
		{ grade: "B", points: 3, minScore: 70 },
		{ grade: "C", points: 2, minScore: 60 },
		{ grade: "D", points: 1, minScore: 50 },
		{ grade: "F", points: 0, minScore: 0 },
	];
}
