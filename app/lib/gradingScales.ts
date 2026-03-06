export interface GradeTier {
	grade: string;
	points: number;
	minScore: number;
}

export interface GradingSystemMap {
	4: GradeTier[];
	5: GradeTier[];
}

export const GRADING_SCALES: GradingSystemMap = {
	5: [
		{ grade: "A", points: 5, minScore: 70 },
		{ grade: "B", points: 4, minScore: 60 },
		{ grade: "C", points: 3, minScore: 50 },
		{ grade: "D", points: 2, minScore: 45 },
		{ grade: "E", points: 1, minScore: 40 },
		{ grade: "F", points: 0, minScore: 0 },
	],
	4: [
		{ grade: "A", points: 4, minScore: 70 },
		{ grade: "B", points: 3, minScore: 60 },
		{ grade: "C", points: 2, minScore: 50 },
		{ grade: "D", points: 1, minScore: 45 },
		{ grade: "F", points: 0, minScore: 0 },
	],
};
