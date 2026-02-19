import { useCallback, useState } from "react";
import { generateGeminiContent } from "../actions/gemini";
import { getUserCourses } from "../storage/course";
import { getCachedAiInsights, saveCachedAiInsights } from "../storage/insights";
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
	useState(() => {
		if (!userId) return;
		const cached = getCachedAiInsights(userId);
		if (cached) {
			setInsights(cached.insights);
			setCachedGeneratedAt(cached.generatedAt);
		}
	});

	const fetchInsights = useCallback(async () => {
		if (!userId) {
			return { success: false, error: "User not found" };
		}

		setLoading(true);
		setError(null);

		try {
			const courses = getUserCourses(userId);
			const cgpa = calculateCGPA(courses);
			const totalCredits = getTotalCredits(courses);
			const completedCourses = getTotalCoursesCompleted(courses);

			const prompt = `As an academic advisor, analyze this student's academic performance and provide 3-5 specific, actionable insights:

Current CGPA: ${cgpa.toFixed(2)} out of 5.0
Total Credits: ${totalCredits} out of 120
Completed Courses: ${completedCourses}

Course Details:
${courses.map((c) => `- ${c.courseCode}: ${c.title}, Grade: ${c.grade || "In Progress"}, Units: ${c.units}, ${c.semester} ${c.year}`).join("\n")}

Provide insights in a numbered list format. Focus on:
1. Strengths and achievements
2. Areas for improvement
3. Specific recommendations for course selection
4. Study strategies based on performance patterns
5. Progress towards degree completion`;

			const response = await generateGeminiContent(prompt);

			if (response.success && response.text) {
				const insightsList = response.text
					.split("\n")
					.filter((line) => line.trim().length > 0)
					.slice(0, 5);

				setInsights(insightsList);
				saveCachedAiInsights(userId, insightsList);
				setCachedGeneratedAt(new Date().toISOString());
				setError(null);

				return { success: true };
			}

			const errorMsg = response.error || "Failed to generate AI insights";
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
