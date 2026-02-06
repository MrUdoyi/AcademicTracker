"use client";

import { AlertCircle, FileText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Navbar } from "../components/navbar";
import { generateGeminiContent } from "../lib/actions/gemini";
import { useAuth } from "../lib/hooks/use-auth";
import { getUserCourses } from "../lib/storage/course";
import {
	calculateCGPA,
	calculateDegreeProgress,
	generateInsights,
	getSemesterPerformance,
	getTotalCoursesCompleted,
	getTotalCredits,
} from "../lib/utils/gpa";
import { downloadTranscript } from "../lib/utils/pdf";

export default function AnalysisPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [activeTab, setActiveTab] = useState<"overview" | "insights">(
		"overview",
	);
	const [aiInsights, setAiInsights] = useState<string[]>([]);
	const [loadingAi, setLoadingAi] = useState(false);
	const [aiError, setAiError] = useState<string | null>(null);
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

	useEffect(() => {
		if (!loading && !user) {
			router.push("/");
		}
	}, [user, loading, router]);

	const generateAiInsights = async () => {
		if (!user) return;

		setLoadingAi(true);
		setAiError(null);

		const courses = getUserCourses(user.id);
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
			const insights = response.text
				.split("\n")
				.filter((line) => line.trim().length > 0)
				.slice(0, 5);
			setAiInsights(insights);
		} else {
			setAiError(response.error || "Failed to generate AI insights");
		}

		setLoadingAi(false);
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<span className="loading loading-spinner loading-lg" />
			</div>
		);
	}

	if (!user) return null;

	const courses = getUserCourses(user.id);

	const handleExportPDF = () => {
		setIsGeneratingPDF(true);
		try {
			downloadTranscript(user, courses, { includeInsights: true });
		} catch (error) {
			console.error("Failed to generate PDF:", error);
		} finally {
			setIsGeneratingPDF(false);
		}
	};
	const cgpa = calculateCGPA(courses);
	const totalCredits = getTotalCredits(courses);
	const completedCourses = getTotalCoursesCompleted(courses);
	const degreeProgress = calculateDegreeProgress(totalCredits);
	const semesterPerformance = getSemesterPerformance(courses);
	const insights = generateInsights(courses);

	const chartData = semesterPerformance.map((sem) => ({
		name: `${sem.semester} ${sem.year}`,
		gpa: Number(sem.gpa.toFixed(2)),
	}));

	return (
		<div className="min-h-screen bg-base-200">
			<Navbar userName={user.name} />

			<div className="container mx-auto p-4 px-4 sm:px-6 lg:px-8 max-w-7xl">
				<div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<h1 className="text-3xl font-bold">Academic Analysis</h1>
						<p className="opacity-70 mt-1">
							Performance visualization and insights
						</p>
					</div>
					<button
						type="button"
						onClick={handleExportPDF}
						disabled={isGeneratingPDF || courses.length === 0}
						className="btn btn-accent gap-2"
					>
						{isGeneratingPDF ? (
							<>
								<span className="loading loading-spinner loading-sm" />
								Generating...
							</>
						) : (
							<>
								<FileText className="w-4 h-4" />
								Export PDF
							</>
						)}
					</button>
				</div>

				<div className="tabs tabs-boxed mb-6 bg-base-100 shadow-lg flex-nowrap overflow-x-auto">
					<button
						type="button"
						className={`tab ${activeTab === "overview" ? "tab-active" : ""}`}
						onClick={() => setActiveTab("overview")}
					>
						<span className="hidden sm:inline">Performance </span>Overview
					</button>
					<button
						type="button"
						className={`tab ${activeTab === "insights" ? "tab-active" : ""}`}
						onClick={() => setActiveTab("insights")}
					>
						<Sparkles className="w-4 h-4 inline mr-2" />
						AI Insights
					</button>
				</div>

				{activeTab === "overview" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="stats shadow">
								<div className="stat">
									<div className="stat-title">Current CGPA</div>
									<div className="stat-value text-primary">
										{cgpa.toFixed(2)}
									</div>
									<div className="stat-desc">Out of 5.0</div>
								</div>
							</div>

							<div className="stats shadow">
								<div className="stat">
									<div className="stat-title">Degree Progress</div>
									<div className="stat-value text-secondary">
										{degreeProgress.toFixed(0)}%
									</div>
									<div className="stat-desc">{totalCredits}/120 credits</div>
								</div>
							</div>

							<div className="stats shadow">
								<div className="stat">
									<div className="stat-title">Completed Courses</div>
									<div className="stat-value text-accent">
										{completedCourses}
									</div>
									<div className="stat-desc">Total courses</div>
								</div>
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title text-xl sm:text-2xl mb-4">
									Semester Performance Trend
								</h2>
								{chartData.length > 0 ? (
									<div className="w-full h-64 sm:h-80 lg:h-96">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={chartData}>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis dataKey="name" />
												<YAxis domain={[0, 5]} />
												<Tooltip />
												<Legend />
												<Bar dataKey="gpa" fill="#570df8" name="GPA" />
											</BarChart>
										</ResponsiveContainer>
									</div>
								) : (
									<div className="text-center py-12">
										<p className="opacity-70">No semester data available yet</p>
										<p className="text-sm opacity-50 mt-2">
											Complete some courses to see performance trends
										</p>
									</div>
								)}
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title text-xl sm:text-2xl mb-4">
									Semester Breakdown
								</h2>
								<div className="overflow-x-auto">
									{semesterPerformance.length > 0 ? (
										<table className="table">
											<thead>
												<tr>
													<th>Semester</th>
													<th>Year</th>
													<th>GPA</th>
													<th>Performance</th>
												</tr>
											</thead>
											<tbody>
												{semesterPerformance.map((sem) => (
													<tr key={`${sem.semester}-${sem.year}`}>
														<td className="font-medium">{sem.semester}</td>
														<td>{sem.year}</td>
														<td>
															<span className="badge badge-primary badge-lg">
																{sem.gpa.toFixed(2)}
															</span>
														</td>
														<td>
															<progress
																className="progress progress-primary w-32"
																value={sem.gpa}
																max="5"
															/>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									) : (
										<div className="text-center py-8 opacity-70">
											No semester data available
										</div>
									)}
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="card bg-base-100 shadow-xl">
								<div className="card-body">
									<h2 className="card-title">Grade Distribution</h2>
									<div className="space-y-2">
										{["A", "B+", "B", "C+", "C", "D+", "D", "E", "F"].map(
											(grade) => {
												const count = courses.filter(
													(c) => c.grade === grade,
												).length;
												const percentage =
													courses.length > 0
														? (count / courses.length) * 100
														: 0;

												return (
													<div key={grade} className="flex items-center gap-3">
														<span className="badge badge-primary w-12">
															{grade}
														</span>
														<progress
															className="progress progress-primary flex-1"
															value={count}
															max={courses.length || 1}
														/>
														<span className="text-sm opacity-70 w-16 text-right">
															{count} ({percentage.toFixed(0)}%)
														</span>
													</div>
												);
											},
										)}
									</div>
								</div>
							</div>

							<div className="card bg-base-100 shadow-xl">
								<div className="card-body">
									<h2 className="card-title">Course Status</h2>
									<div className="space-y-4">
										<div className="stat bg-base-200 rounded-lg">
											<div className="stat-title">Completed</div>
											<div className="stat-value text-success">
												{completedCourses}
											</div>
											<div className="stat-desc">courses</div>
										</div>
										<div className="stat bg-base-200 rounded-lg">
											<div className="stat-title">In Progress</div>
											<div className="stat-value text-warning">
												{
													courses.filter((c) => c.status === "in-progress")
														.length
												}
											</div>
											<div className="stat-desc">courses</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === "insights" && (
					<div className="space-y-6">
						<div className="card bg-primary text-primary-content shadow-xl">
							<div className="card-body">
								<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
									<h2 className="card-title text-xl sm:text-2xl gap-2">
										<Sparkles className="w-6 h-6" />
										AI-Powered Insights
									</h2>
									<button
										type="button"
										onClick={generateAiInsights}
										disabled={loadingAi}
										className="btn btn-secondary btn-sm gap-2"
									>
										{loadingAi ? (
											<>
												<span className="loading loading-spinner loading-sm" />
												Generating...
											</>
										) : (
											<>
												<Sparkles className="w-4 h-4" />
												Generate Insights
											</>
										)}
									</button>
								</div>

								{aiError && (
									<div role="alert" className="alert alert-error">
										<AlertCircle className="h-6 w-6 shrink-0" />
										<span>{aiError}</span>
									</div>
								)}

								{aiInsights.length > 0 ? (
									<div className="space-y-3 mt-4">
										{aiInsights.map((insight, idx) => (
											<div
												key={idx}
												className="bg-base-100 text-base-content p-4 rounded-lg"
											>
												<p className="text-sm sm:text-base">{insight}</p>
											</div>
										))}
									</div>
								) : !loadingAi && !aiError ? (
									<div className="text-center py-8">
										<p className="text-lg">No AI insights generated yet</p>
										<p className="opacity-70 mt-2">
											Click &quot;Generate Insights&quot; to get personalized
											recommendations
										</p>
									</div>
								) : null}
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title text-xl sm:text-2xl">
									Rule-Based Insights
								</h2>
								{insights.length > 0 ? (
									<ul className="space-y-3 mt-4">
										{insights.map((insight, idx) => (
											<li key={idx} className="text-sm sm:text-base">
												• {insight}
											</li>
										))}
									</ul>
								) : (
									<div className="text-center py-8">
										<p className="text-base sm:text-lg">
											No insights available yet
										</p>
										<p className="opacity-70 mt-2 text-sm sm:text-base">
											Complete some courses to receive recommendations
										</p>
									</div>
								)}
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title text-xl sm:text-2xl">
									Performance Summary
								</h2>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
									<div>
										<h3 className="font-bold text-lg mb-3">Strengths</h3>
										<ul className="space-y-2">
											{cgpa >= 4.0 && (
												<li className="text-success">
													✓ Excellent overall CGPA
												</li>
											)}
											{completedCourses >= 10 && (
												<li className="text-success">
													✓ Strong course completion record
												</li>
											)}
											{semesterPerformance.length >= 2 &&
												semesterPerformance[semesterPerformance.length - 1]
													.gpa >
													semesterPerformance[semesterPerformance.length - 2]
														.gpa && (
													<li className="text-success">
														✓ Improving trend in recent semester
													</li>
												)}
										</ul>
									</div>
									<div>
										<h3 className="font-bold text-lg mb-3">
											Areas for Improvement
										</h3>
										<ul className="space-y-2">
											{cgpa < 3.0 && cgpa > 0 && (
												<li className="text-warning">! CGPA needs attention</li>
											)}
											{courses.filter((c) => c.status === "in-progress")
												.length > 6 && (
												<li className="text-warning">
													! Heavy course load - monitor workload
												</li>
											)}
											{semesterPerformance.length >= 2 &&
												semesterPerformance[semesterPerformance.length - 1]
													.gpa <
													semesterPerformance[semesterPerformance.length - 2]
														.gpa && (
													<li className="text-warning">
														! Recent GPA decline - review study habits
													</li>
												)}
										</ul>
									</div>
								</div>
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title text-xl sm:text-2xl">
									Recommendations
								</h2>
								<ul className="space-y-2 mt-4 list-disc list-inside">
									<li className="text-sm sm:text-base">
										Maintain consistent study habits throughout the semester
									</li>
									<li className="text-sm sm:text-base">
										Balance your course load to avoid burnout and maintain
										quality
									</li>
									<li className="text-sm sm:text-base">
										Seek help early if you&apos;re struggling with any course
									</li>
								</ul>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
