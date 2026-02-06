import type { Course, Grade } from "../schemas/course";

/**
 * Grade point mapping based on standard 5-point scale
 */
const GRADE_POINTS: Record<Grade, number> = {
	A: 5.0,
	"B+": 4.5,
	B: 4.0,
	"C+": 3.5,
	C: 3.0,
	"D+": 2.5,
	D: 2.0,
	E: 1.0,
	F: 0.0,
};

/**
 * Convert grade to grade points
 */
export function gradeToPoints(grade: Grade): number {
	return GRADE_POINTS[grade];
}

/**
 * Calculate GPA for a list of courses
 */
export function calculateGPA(courses: Course[]): number {
	const completedCourses = courses.filter(
		(c) => c.status === "completed" && c.grade,
	);

	if (completedCourses.length === 0) return 0;

	let totalPoints = 0;
	let totalUnits = 0;

	for (const course of completedCourses) {
		if (course.grade) {
			const points = gradeToPoints(course.grade);
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
): number {
	const semesterCourses = courses.filter(
		(c) =>
			c.semester === semester &&
			c.year === year &&
			c.status === "completed" &&
			c.grade,
	);

	return calculateGPA(semesterCourses);
}

/**
 * Calculate CGPA (Cumulative GPA) for all completed courses
 */
export function calculateCGPA(courses: Course[]): number {
	return calculateGPA(courses);
}

/**
 * Get total credits/units completed
 */
export function getTotalCredits(courses: Course[]): number {
	return courses
		.filter((c) => c.status === "completed")
		.reduce((sum, course) => sum + course.units, 0);
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
			gpa: calculateGPA(semCourses),
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
	totalRequiredCredits: number = 120,
): number {
	return Math.min((completedCredits / totalRequiredCredits) * 100, 100);
}

/**
 * Generate academic insights based on performance
 */
export function generateInsights(courses: Course[]): string[] {
	const insights: string[] = [];
	const cgpa = calculateCGPA(courses);
	const performance = getSemesterPerformance(courses);

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
