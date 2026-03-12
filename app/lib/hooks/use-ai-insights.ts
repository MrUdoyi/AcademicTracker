import { useCallback, useEffect, useState } from "react";
import type { GeminiResponse } from "../actions/gemini";
import { normalizeGradingScale } from "../schemas/grading-scale";
import { getUserCourses } from "../storage/course";
import { getCachedAiInsights, saveCachedAiInsights } from "../storage/insights";
import {
	DEFAULT_TOTAL_DEGREE_CREDITS,
	getUserAcademicBase,
	getUserGradingScale,
	getUserTargetGpa,
	getUserTotalDegreeCredits,
	getUserCurrentAcademicContext,
} from "../storage/user";
import { generatePersonalizedInsights } from "../utils/recommendations";
import {
	calculateCGPA,
	getTotalCoursesCompleted,
	getTotalCredits,
} from "../utils/gpa";

export interface UseAiInsightsReturn {
	insights: string[];
	cachedGeneratedAt: string | null;
	loading: boolean;
	error: string | null;
	fetchInsights: () => Promise<{ success: boolean; error?: string }>;
}

/**
 * Hook to manage AI insights fetching, caching, and validation
 */
export function useAiInsights(userId: string | null): UseAiInsightsReturn {
	const [insights, setInsights] = useState<string[]>([]);
	const [cachedGeneratedAt, setCachedGeneratedAt] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load cached insights on mount
	useEffect(() => {
		if (!userId) return;

		void (async () => {
			const cached = await getCachedAiInsights(userId);
			if (cached) {
				setInsights(cached.insights);
				setCachedGeneratedAt(cached.generatedAt);
			}
		})();
	}, [userId]);

	const fetchInsights = useCallback(async () => {
		if (!userId) {
			return { success: false, error: "User not found" };
		}

		setLoading(true);
		setError(null);

		try {
			const [courses, base, gradingScale, totalDegreeCredits, targetCGPA, currentContext] = await Promise.all([
				getUserCourses(userId),
				getUserAcademicBase(userId),
				getUserGradingScale(userId),
				getUserTotalDegreeCredits(userId),
				getUserTargetGpa(userId),
				getUserCurrentAcademicContext(userId),
			]);
			const currentLevel = currentContext.currentLevel;
			const currentSemester = currentContext.currentSemester;
			const cgpa = calculateCGPA(
				courses,
				base,
				gradingScale,
				undefined,
				currentLevel,
				currentSemester,
			);
			const totalCredits = getTotalCredits(
				courses,
				base?.baseTotalCredits || 0,
				currentLevel,
				currentSemester,
			);
			const completedCourses = getTotalCoursesCompleted(courses);
			const inProgressCourses = courses.filter(
				(course) => course.status === "in-progress",
			);
			const normalizedScale = normalizeGradingScale(gradingScale);
			const maxScaleWeight = normalizedScale[0]?.weight ?? 5;
			const smartAdvisorInsights = generatePersonalizedInsights({
				inProgressCourses,
				targetCGPA,
				gradingScale,
			});
			const smartAdvisorBlock = smartAdvisorInsights
				.map((insight, index) => `${index + 1}. ${insight}`)
				.join("\n");

			const prompt = `As an academic advisor, analyze this student's academic performance and provide 3-5 specific, actionable insights:

Current CGPA: ${cgpa.toFixed(2)} out of ${maxScaleWeight.toFixed(1)}
Total Credits: ${totalCredits} out of ${totalDegreeCredits || DEFAULT_TOTAL_DEGREE_CREDITS}
Completed Courses: ${completedCourses}
In-Progress Courses: ${inProgressCourses.length}
Target CGPA: ${targetCGPA !== null ? targetCGPA.toFixed(2) : "Not set"}

Course Details:
${courses.map((c) => `- ${c.courseCode}: ${c.title}, Grade: ${c.grade || "In Progress"}, Units: ${c.units}, ${c.semester} ${c.year}`).join("\n")}

Smart Advisor baseline insights (rule-based):
${smartAdvisorBlock}

Provide insights in a numbered list format. Focus on:
1. Strengths and achievements
2. Areas for improvement
3. Specific recommendations for course selection
4. Study strategies based on performance patterns
5. Progress towards degree completion

Important constraints:
- Build on the Smart Advisor baseline above; do not repeat it verbatim.
- Every insight must reference at least one concrete course code or numeric academic metric.
- Avoid generic advice like "study harder" without course-specific context.
- Prioritize in-progress courses and the target CGPA trajectory.`;

			const response = await fetch("/api/gemini", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ prompt }),
			});

			const data = (await response.json()) as GeminiResponse;

			if (!response.ok) {
				const errorMsg = data.error || "Failed to generate AI insights";
				setError(errorMsg);
				return { success: false, error: errorMsg };
			}

			if (data.success && data.text) {
				const insightsList = data.text
					.split("\n")
					.filter((line) => line.trim().length > 0)
					.slice(0, 5);

				setInsights(insightsList);
				await saveCachedAiInsights(userId, insightsList);
				setCachedGeneratedAt(new Date().toISOString());
				setError(null);

				return { success: true };
			}

			const errorMsg = data.error || "Failed to generate AI insights";
			setError(errorMsg);
			return { success: false, error: errorMsg };
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : "Unknown error";
			setError(errorMsg);
			return { success: false, error: errorMsg };
		} finally {
			setLoading(false);
		}
	}, [userId]);

	return {
		insights,
		cachedGeneratedAt,
		loading,
		error,
		fetchInsights,
	};
}
