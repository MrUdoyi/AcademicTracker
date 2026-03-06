import type { Course } from "../schemas/course";
import type { GradingScale } from "../schemas/grading-scale";
import { normalizeGradingScale } from "../schemas/grading-scale";
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
	gradingScale?: GradingScale | null,
): string[] {
	const tips: string[] = [];
	const completedCourses = courses.filter(
		(course) => course.status === "completed" && course.grade,
	);
	const lowGradeCourses = completedCourses
		.filter(
			(course) => course.grade && gradeToPoints(course.grade, gradingScale) <= 2.5,
		)
		.slice(0, 3);

	for (const course of lowGradeCourses) {
		tips.push(
			`Prioritize ${course.courseCode} (${course.title}): review weak topics and schedule 2 focused revision sessions this week.`,
		);
	}

	const cgpa = calculateCGPA(courses, base, gradingScale);
	if (cgpa > 0 && cgpa < 3.0) {
		tips.push(
			"Your CGPA is currently below 3.0. Meet a course adviser and create a weekly recovery plan for your lowest-performing courses.",
		);
	}

	const semesterPerformance = getSemesterPerformance(courses, gradingScale);
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

interface PersonalizedInsightInput {
	inProgressCourses: Course[];
	targetCGPA: number | null;
	gradingScale?: GradingScale | null;
}

export function generatePersonalizedInsights({
	inProgressCourses,
	targetCGPA,
	gradingScale,
}: PersonalizedInsightInput): string[] {
	const insights: string[] = [];

	if (!Array.isArray(inProgressCourses) || inProgressCourses.length === 0) {
		return [
			"Add at least one in-progress course to unlock Smart Advisor recommendations.",
		];
	}

	if (targetCGPA === null || !Number.isFinite(targetCGPA)) {
		insights.push(
			"Set a Target CGPA to receive course-priority recommendations tied to your goal.",
		);
	}

	const normalizedScale = normalizeGradingScale(gradingScale);

	const closestBoundaryCourse = inProgressCourses
		.map((course) => {
			const currentScore = course.currentScore ?? 0;
			const currentTier = normalizedScale.find(
				(tier) => currentScore >= tier.minScore,
			);

			if (!currentTier) return null;

			const currentTierIndex = normalizedScale.findIndex(
				(tier) =>
					tier.grade === currentTier.grade &&
					tier.minScore === currentTier.minScore &&
					tier.weight === currentTier.weight,
			);
			const nextBoundary =
				currentTierIndex > 0 ? normalizedScale[currentTierIndex - 1] : null;

			if (!nextBoundary) return null;

			const pointsAway = Number((nextBoundary.minScore - currentScore).toFixed(2));
			if (pointsAway >= 5) return null;

			return {
				course,
				nextBoundary,
				pointsAway,
			};
		})
		.filter((value): value is NonNullable<typeof value> => value !== null)
		.sort((a, b) => {
			if (a.pointsAway !== b.pointsAway) return a.pointsAway - b.pointsAway;
			return b.course.units - a.course.units;
		})[0];

	const highestLeverageCourse = [...inProgressCourses].sort(
		(a, b) => b.units - a.units,
	)[0];

	if (closestBoundaryCourse && highestLeverageCourse) {
		const targetText =
			targetCGPA !== null && Number.isFinite(targetCGPA)
				? targetCGPA.toFixed(2)
				: "your target CGPA";

		if (closestBoundaryCourse.course.id === highestLeverageCourse.id) {
			insights.push(
				`You are only ${closestBoundaryCourse.pointsAway.toFixed(2)} marks away from a '${closestBoundaryCourse.nextBoundary.grade}' in ${closestBoundaryCourse.course.courseCode}. Since it is a ${closestBoundaryCourse.course.units}-credit course, securing that '${closestBoundaryCourse.nextBoundary.grade}' will give you the biggest boost toward ${targetText}.`,
			);
		} else {
			insights.push(
				`You are only ${closestBoundaryCourse.pointsAway.toFixed(2)} marks away from a '${closestBoundaryCourse.nextBoundary.grade}' in ${closestBoundaryCourse.course.courseCode}. Focus revision there first for a quick grade jump.`,
			);
			insights.push(
				`${highestLeverageCourse.courseCode} is your highest leverage course at ${highestLeverageCourse.units} credits. Prioritize it this week to maximize movement toward ${targetText}.`,
			);
		}
	} else if (highestLeverageCourse) {
		const targetText =
			targetCGPA !== null && Number.isFinite(targetCGPA)
				? targetCGPA.toFixed(2)
				: "your target CGPA";
		insights.push(
			`${highestLeverageCourse.courseCode} carries the highest weight (${highestLeverageCourse.units} credits). Prioritize assignments and exam prep here to get the strongest impact toward ${targetText}.`,
		);
	}

	if (insights.length === 0) {
		insights.push(
			"Your in-progress courses are not yet within 5 marks of an immediate grade boundary. Focus on your highest-credit course first, then reassess after your next assessment update.",
		);
	}

	return insights.slice(0, 5);
}
