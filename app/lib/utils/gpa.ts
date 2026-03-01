import type { Course, Grade } from "../schemas/course";
import {
	getScaleItemByGrade,
	normalizeGradingScale,
	type GradingScale,
} from "../schemas/grading-scale";

export interface CgpaBaseValues {
	baseCgpa: number;
	baseTotalCredits: number;
}

export interface CalculateRequiredSemesterGPAInput {
	targetCGPA: number;
	pastCGPA: number;
	pastTotalCredits: number;
	currentSemesterCredits: number;
	gradingScale?: GradingScale | null;
}

export interface CalculateRequiredSemesterGPAResult {
	success: boolean;
	requiredSemesterGPA?: number;
	isTargetAchievable?: boolean;
	maxPossibleSemesterGPA?: number;
	maxRealisticCGPA?: number;
	error?: string;
}

export interface CalculateMaxAchievableCGPAInput {
	pastCGPA: number;
	pastTotalCredits: number;
	totalDegreeCredits: number;
	gradingScale?: GradingScale | null;
}

export interface CalculateMaxAchievableCGPAResult {
	success: boolean;
	maxAchievableCGPA?: number;
	remainingCredits?: number;
	maxPossibleSemesterGPA?: number;
	error?: string;
}

/**
 * Convert grade to grade points
 */
export function gradeToPoints(
	grade: Grade,
	gradingScale?: GradingScale | null,
): number {
	return getScaleItemByGrade(grade, gradingScale)?.weight ?? 0;
}

/**
 * Calculate GPA for a list of courses
 */
export function calculateGPA(
	courses: Course[],
	gradingScale?: GradingScale | null,
): number {
	const normalizedScale = normalizeGradingScale(gradingScale);
	const completedCourses = courses.filter(
		(c) => c.status === "completed" && c.grade,
	);

	if (completedCourses.length === 0) return 0;

	let totalPoints = 0;
	let totalUnits = 0;

	for (const course of completedCourses) {
		if (course.grade) {
			const points = gradeToPoints(course.grade, normalizedScale);
			totalPoints += points * course.units;
			totalUnits += course.units;
		}
	}

	return totalUnits > 0 ? totalPoints / totalUnits : 0;
}

/**
 * Calculate semester GPA
 */
export function calculateSemesterGPA(
	courses: Course[],
	semester: string,
	year: number,
	gradingScale?: GradingScale | null,
): number {
	const semesterCourses = courses.filter(
		(c) =>
			c.semester === semester &&
			c.year === year &&
			c.status === "completed" &&
			c.grade,
	);

	return calculateGPA(semesterCourses, gradingScale);
}

/**
 * Calculate CGPA (Cumulative GPA) for all completed courses
 */
export function calculateCGPA(
	courses: Course[],
	base?: CgpaBaseValues | null,
	gradingScale?: GradingScale | null,
): number {
	return calculateCGPAWithBase(courses, base, gradingScale);
}

/**
 * Calculate CGPA with optional base CGPA + base credits (quick-start values)
 */
export function calculateCGPAWithBase(
	courses: Course[],
	base?: CgpaBaseValues | null,
	gradingScale?: GradingScale | null,
): number {
	const normalizedScale = normalizeGradingScale(gradingScale);
	const completedCourses = courses.filter(
		(course) => course.status === "completed" && course.grade,
	);

	let totalPoints = 0;
	let totalUnits = 0;

	for (const course of completedCourses) {
		if (!course.grade) continue;
		totalPoints += gradeToPoints(course.grade, normalizedScale) * course.units;
		totalUnits += course.units;
	}

	const baseCgpa = base?.baseCgpa ?? 0;
	const baseTotalCredits = base?.baseTotalCredits ?? 0;
	const hasValidBase = baseTotalCredits > 0 && baseCgpa >= 0;

	if (hasValidBase) {
		totalPoints += baseCgpa * baseTotalCredits;
		totalUnits += baseTotalCredits;
	}

	if (totalUnits === 0) return 0;

	return totalPoints / totalUnits;
}

/**
 * Get total credits/units completed
 */
export function getTotalCredits(courses: Course[], baseTotalCredits: number = 0): number {
	return (
		courses
		.filter((c) => c.status === "completed")
		.reduce((sum, course) => sum + course.units, 0) + Math.max(0, baseTotalCredits)
	);
}

/**
 * Get total courses completed
 */
export function getTotalCoursesCompleted(courses: Course[]): number {
	return courses.filter((c) => c.status === "completed").length;
}

/**
 * Get courses in progress
 */
export function getCoursesInProgress(courses: Course[]): number {
	return courses.filter((c) => c.status === "in-progress").length;
}

/**
 * Get semester performance data for visualization
 */
export function getSemesterPerformance(
	courses: Course[],
	gradingScale?: GradingScale | null,
): Array<{ semester: string; gpa: number; year: number }> {
	const semesters = new Map<string, { courses: Course[]; year: number }>();

	for (const course of courses) {
		if (course.status === "completed" && course.grade) {
			const key = `${course.semester}-${course.year}`;
			if (!semesters.has(key)) {
				semesters.set(key, { courses: [], year: course.year });
			}
			const semesterData = semesters.get(key);
			if (semesterData) {
				semesterData.courses.push(course);
			}
		}
	}

	const performance = Array.from(semesters.entries()).map(
		([key, { courses: semCourses, year }]) => ({
			semester: key.split("-")[0],
			year,
			gpa: calculateGPA(semCourses, gradingScale),
		}),
	);

	performance.sort((a, b) => {
		if (a.year !== b.year) return a.year - b.year;
		return a.semester.localeCompare(b.semester);
	});

	return performance;
}

/**
 * Calculate degree progress percentage
 */
export function calculateDegreeProgress(
	completedCredits: number,
	totalRequiredCredits: number,
): number {
	if (!Number.isFinite(totalRequiredCredits) || totalRequiredCredits <= 0) {
		return 0;
	}
	return Math.min((completedCredits / totalRequiredCredits) * 100, 100);
}

/**
 * Generate academic insights based on performance
 */
export function generateInsights(
	courses: Course[],
	base?: CgpaBaseValues | null,
	gradingScale?: GradingScale | null,
): string[] {
	const insights: string[] = [];
	const cgpa = calculateCGPAWithBase(courses, base, gradingScale);
	const performance = getSemesterPerformance(courses, gradingScale);

	if (cgpa >= 4.5) {
		insights.push(
			"Outstanding performance! You're maintaining an excellent CGPA.",
		);
	} else if (cgpa >= 4.0) {
		insights.push("Great work! Your academic performance is strong.");
	} else if (cgpa >= 3.0) {
		insights.push("Good progress. Consider focusing on challenging courses.");
	} else if (cgpa > 0) {
		insights.push(
			"Your CGPA needs improvement. Consider seeking academic support.",
		);
	}

	if (performance.length >= 2) {
		const recent = performance.slice(-2);
		const trend = recent[1].gpa - recent[0].gpa;

		if (trend > 0.3) {
			insights.push("Your grades are trending upward - keep it up!");
		} else if (trend < -0.3) {
			insights.push(
				"Your recent semester GPA dropped. Consider reviewing your study approach.",
			);
		}
	}

	const inProgress = getCoursesInProgress(courses);
	if (inProgress > 6) {
		insights.push(
			`You have ${inProgress} courses in progress. Consider your workload balance.`,
		);
	}

	const completedCount = getTotalCoursesCompleted(courses);
	if (completedCount > 0 && completedCount % 10 === 0) {
		insights.push(
			`Milestone achieved! You've completed ${completedCount} courses.`,
		);
	}

	return insights;
}

export function calculateRequiredSemesterGPA(
	input: CalculateRequiredSemesterGPAInput,
): CalculateRequiredSemesterGPAResult {
	const {
		targetCGPA,
		pastCGPA,
		pastTotalCredits,
		currentSemesterCredits,
		gradingScale,
	} = input;

	if (!Number.isFinite(targetCGPA) || targetCGPA < 0) {
		return {
			success: false,
			error: "Target CGPA must be a non-negative number.",
		};
	}

	if (!Number.isFinite(pastCGPA) || pastCGPA < 0) {
		return {
			success: false,
			error: "Past CGPA must be a non-negative number.",
		};
	}

	if (!Number.isFinite(pastTotalCredits) || pastTotalCredits < 0) {
		return {
			success: false,
			error: "Past total credits must be a non-negative number.",
		};
	}

	if (
		!Number.isFinite(currentSemesterCredits) ||
		currentSemesterCredits <= 0
	) {
		return {
			success: false,
			error: "Current semester credits must be greater than 0.",
		};
	}

	const normalizedScale = normalizeGradingScale(gradingScale);
	const maxPossibleSemesterGPA = normalizedScale[0]?.weight ?? 5;

	const requiredRaw =
		((targetCGPA * (pastTotalCredits + currentSemesterCredits)) -
			pastCGPA * pastTotalCredits) /
		currentSemesterCredits;
	const requiredSemesterGPA = Number(Math.max(0, requiredRaw).toFixed(2));

	if (requiredSemesterGPA <= maxPossibleSemesterGPA) {
		return {
			success: true,
			requiredSemesterGPA,
			isTargetAchievable: true,
			maxPossibleSemesterGPA,
		};
	}

	const maxRealisticCGPA = Number(
		(
			(pastCGPA * pastTotalCredits +
				maxPossibleSemesterGPA * currentSemesterCredits) /
			(pastTotalCredits + currentSemesterCredits)
		).toFixed(2),
	);

	return {
		success: true,
		requiredSemesterGPA,
		isTargetAchievable: false,
		maxPossibleSemesterGPA,
		maxRealisticCGPA,
	};
}

export function calculateMaxAchievableCGPA(
	input: CalculateMaxAchievableCGPAInput,
): CalculateMaxAchievableCGPAResult {
	const { pastCGPA, pastTotalCredits, totalDegreeCredits, gradingScale } = input;

	if (!Number.isFinite(pastCGPA) || pastCGPA < 0) {
		return {
			success: false,
			error: "Past CGPA must be a non-negative number.",
		};
	}

	if (!Number.isFinite(pastTotalCredits) || pastTotalCredits < 0) {
		return {
			success: false,
			error: "Past total credits must be a non-negative number.",
		};
		}

	if (!Number.isFinite(totalDegreeCredits) || totalDegreeCredits <= 0) {
		return {
			success: false,
			error: "Total degree credits must be greater than 0.",
		};
	}

	const normalizedScale = normalizeGradingScale(gradingScale);
	const maxPossibleSemesterGPA = normalizedScale[0]?.weight ?? 5;
	const cappedPastCredits = Math.min(pastTotalCredits, totalDegreeCredits);
	const remainingCredits = Math.max(totalDegreeCredits - cappedPastCredits, 0);
	const totalCreditsAtGraduation = cappedPastCredits + remainingCredits;

	if (totalCreditsAtGraduation <= 0) {
		return {
			success: true,
			maxAchievableCGPA: 0,
			remainingCredits,
			maxPossibleSemesterGPA,
		};
	}

	const maxAchievableCGPA = Number(
		(
			(pastCGPA * cappedPastCredits +
				maxPossibleSemesterGPA * remainingCredits) /
			totalCreditsAtGraduation
		).toFixed(2),
	);

	return {
		success: true,
		maxAchievableCGPA,
		remainingCredits,
		maxPossibleSemesterGPA,
	};
}
