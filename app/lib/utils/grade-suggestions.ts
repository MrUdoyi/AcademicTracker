import { normalizeGradingScale, type GradingScale } from "../schemas/grading-scale";

export interface InProgressCourseForSuggestion {
	id?: string;
	courseCode: string;
	units: number;
}

export interface SuggestedCourseGrade {
	id?: string;
	courseCode: string;
	units: number;
	targetGrade: string;
	targetGradeWeight: number;
}

export interface SuggestCourseGradesInput {
	requiredSemesterGPA: number;
	inProgressCourses: InProgressCourseForSuggestion[];
	gradingScale?: GradingScale | null;
}

export interface SuggestCourseGradesResult {
	success: boolean;
	isTargetAchievable?: boolean;
	requiredSemesterGPA?: number;
	projectedSemesterGPA?: number;
	maxPossibleSemesterGPA?: number;
	suggestions?: SuggestedCourseGrade[];
	error?: string;
}

interface InternalSuggestionState {
	course: InProgressCourseForSuggestion;
	gradeIndex: number;
}

function round2(value: number): number {
	return Number(value.toFixed(2));
}

function computeProjectedGpa(
	states: InternalSuggestionState[],
	scaleByWeightDesc: Array<{ grade: string; weight: number }>,
): number {
	const totalUnits = states.reduce((sum, item) => sum + item.course.units, 0);
	if (totalUnits <= 0) return 0;

	const weightedPoints = states.reduce((sum, item) => {
		const grade = scaleByWeightDesc[item.gradeIndex];
		return sum + item.course.units * grade.weight;
	}, 0);

	return round2(weightedPoints / totalUnits);
}

function toPublicSuggestions(
	states: InternalSuggestionState[],
	scaleByWeightDesc: Array<{ grade: string; weight: number }>,
): SuggestedCourseGrade[] {
	return states.map((item) => {
		const grade = scaleByWeightDesc[item.gradeIndex];
		return {
			id: item.course.id,
			courseCode: item.course.courseCode,
			units: item.course.units,
			targetGrade: grade.grade,
			targetGradeWeight: grade.weight,
		};
	});
}

export function suggestCourseGrades(
	input: SuggestCourseGradesInput,
): SuggestCourseGradesResult {
	const { requiredSemesterGPA, inProgressCourses, gradingScale } = input;

	if (!Number.isFinite(requiredSemesterGPA) || requiredSemesterGPA < 0) {
		return {
			success: false,
			error: "Required semester GPA must be a non-negative number.",
		};
	}

	if (!Array.isArray(inProgressCourses) || inProgressCourses.length === 0) {
		return {
			success: false,
			error: "At least one in-progress course is required.",
		};
	}

	for (const course of inProgressCourses) {
		if (!course.courseCode || course.courseCode.trim().length === 0) {
			return {
				success: false,
				error: "Each course must include a courseCode.",
			};
		}
		if (!Number.isFinite(course.units) || course.units <= 0) {
			return {
				success: false,
				error: `Course ${course.courseCode} must have units greater than 0.`,
			};
		}
	}

	const normalizedScale = normalizeGradingScale(gradingScale)
		.map((item) => ({ grade: item.grade, weight: item.weight }))
		.sort((a, b) => b.weight - a.weight);

	if (normalizedScale.length === 0) {
		return {
			success: false,
			error: "Grading scale is empty or invalid.",
		};
	}

	const maxPossibleSemesterGPA = normalizedScale[0].weight;

	if (requiredSemesterGPA > maxPossibleSemesterGPA) {
		const allMax = inProgressCourses.map((course) => ({
			id: course.id,
			courseCode: course.courseCode,
			units: course.units,
			targetGrade: normalizedScale[0].grade,
			targetGradeWeight: normalizedScale[0].weight,
		}));

		return {
			success: true,
			isTargetAchievable: false,
			requiredSemesterGPA: round2(requiredSemesterGPA),
			projectedSemesterGPA: round2(maxPossibleSemesterGPA),
			maxPossibleSemesterGPA,
			suggestions: allMax,
		};
	}

	const baselineIndex = normalizedScale.findIndex(
		(item) => item.weight <= requiredSemesterGPA,
	);
	const defaultIndex = baselineIndex >= 0 ? baselineIndex : normalizedScale.length - 1;

	const states: InternalSuggestionState[] = inProgressCourses
		.map((course) => ({ course, gradeIndex: defaultIndex }))
		.sort((a, b) => b.course.units - a.course.units);

	let projectedSemesterGPA = computeProjectedGpa(states, normalizedScale);

	if (projectedSemesterGPA < requiredSemesterGPA) {
		const maxIterations = inProgressCourses.length * normalizedScale.length * 2;
		let iterations = 0;

		while (projectedSemesterGPA < requiredSemesterGPA && iterations < maxIterations) {
			const nextUpgradable = states.find((item) => item.gradeIndex > 0);
			if (!nextUpgradable) break;

			nextUpgradable.gradeIndex -= 1;
			projectedSemesterGPA = computeProjectedGpa(states, normalizedScale);
			iterations += 1;
		}
	}

	const isTargetAchievable = projectedSemesterGPA >= requiredSemesterGPA;

	return {
		success: true,
		isTargetAchievable,
		requiredSemesterGPA: round2(requiredSemesterGPA),
		projectedSemesterGPA,
		maxPossibleSemesterGPA,
		suggestions: toPublicSuggestions(states, normalizedScale),
	};
}
