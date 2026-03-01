import type { Course } from "../schemas/course";
import {
	calculateCGPA,
	type CgpaBaseValues,
	getCoursesInProgress,
	getSemesterPerformance,
	getTotalCoursesCompleted,
	gradeToPoints,
} from "./gpa";

/**
 * Generate personalized study tips from academic trends and course outcomes.
 */
export function generateStudyTips(
	courses: Course[],
	base?: CgpaBaseValues | null,
): string[] {
	const tips: string[] = [];
	const completedCourses = courses.filter(
		(course) => course.status === "completed" && course.grade,
	);
	const lowGradeCourses = completedCourses
		.filter((course) => course.grade && gradeToPoints(course.grade) <= 2.5)
		.slice(0, 3);

	for (const course of lowGradeCourses) {
		tips.push(
			`Prioritize ${course.courseCode} (${course.title}): review weak topics and schedule 2 focused revision sessions this week.`,
		);
	}

	const cgpa = calculateCGPA(courses, base);
	if (cgpa > 0 && cgpa < 3.0) {
		tips.push(
			"Your CGPA is currently below 3.0. Meet a course adviser and create a weekly recovery plan for your lowest-performing courses.",
		);
	}

	const semesterPerformance = getSemesterPerformance(courses);
	if (semesterPerformance.length >= 2) {
		const recent = semesterPerformance.slice(-2);
		const trend = recent[1].gpa - recent[0].gpa;

		if (trend < -0.2) {
			tips.push(
				"Recent semester GPA dropped. Reduce overload and increase active practice (past questions, timed quizzes).",
			);
		}
	}

	const inProgress = getCoursesInProgress(courses);
	if (inProgress >= 5) {
		tips.push(
			`You have ${inProgress} in-progress courses. Use a weekly study timetable to balance workload and avoid last-minute cramming.`,
		);
	}

	if (tips.length === 0 && getTotalCoursesCompleted(courses) > 0) {
		tips.push(
			"Performance is stable. Keep a consistent weekly review routine and maintain strong attendance to protect your GPA trend.",
		);
	}

	return tips.slice(0, 5);
}
