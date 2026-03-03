"use client";

import { ChevronDown, FileText, Plus, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { FeatureTour } from "../components/feature-tour";
import { InProgressCourseCard } from "../components/in-progress-course-card";
import { Navbar } from "../components/navbar";
import { OfflineBanner } from "../components/offline-banner";
import { TargetSimulator } from "../components/target-simulator";
import { useAuth } from "../lib/hooks/use-auth";
import type { Course } from "../lib/schemas/course";
import type { GradingScale } from "../lib/schemas/grading-scale";
import { getUserCourses, updateCourse } from "../lib/storage/course";
import {
	DEFAULT_TOTAL_DEGREE_CREDITS,
	getUserAcademicBase,
	getUserGradingScale,
	getUserTargetGpa,
	getUserTotalDegreeCredits,
	type AcademicBaseValues,
} from "../lib/storage/user";
import { generatePersonalizedInsights } from "../lib/utils/recommendations";
import {
	calculateCGPA,
	calculateDegreeProgress,
	gradeToPoints,
	getCoursesInProgress,
	getSemesterPerformance,
	getTotalCoursesCompleted,
	getTotalCredits,
} from "../lib/utils/gpa";
import { downloadTranscript } from "../lib/utils/pdf";

type PerformanceLevel =
	| "all"
	| "excellent"
	| "good"
	| "average"
	| "needs-improvement"
	| "in-progress";

function toDisplayFirstName(name?: string, email?: string): string {
	const normalized = (name ?? "").trim();
	if (normalized) {
		const source = normalized.includes("@")
			? normalized.split("@")[0]
			: normalized;
		const [firstToken] = source.split(/[\s._-]+/);
		if (firstToken) return firstToken;
	}

	const localPart = (email ?? "").split("@")[0]?.trim();
	if (localPart) {
		const [firstToken] = localPart.split(/[\s._-]+/);
		if (firstToken) return firstToken;
	}

	return "Student";
}

function getCoursePerformanceLevel(course: Course): Exclude<PerformanceLevel, "all"> {
	if (course.status === "in-progress" || !course.grade) {
		return "in-progress";
	}

	const points = gradeToPoints(course.grade);
	if (points >= 4.5) return "excellent";
	if (points >= 4.0) return "good";
	if (points >= 3.0) return "average";
	return "needs-improvement";
}

export default function DashboardPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
	const [courses, setCourses] = useState<Course[]>([]);
	const [academicBase, setAcademicBase] = useState<AcademicBaseValues | null>(null);
	const [gradingScale, setGradingScale] = useState<GradingScale | null>(null);
	const [totalDegreeCredits, setTotalDegreeCredits] = useState<number>(
		DEFAULT_TOTAL_DEGREE_CREDITS,
	);
	const [targetCgpa, setTargetCgpa] = useState<number | null>(null);
	const [selectedSemester, setSelectedSemester] = useState("all");
	const [selectedCourse, setSelectedCourse] = useState("all");
	const [selectedPerformance, setSelectedPerformance] =
		useState<PerformanceLevel>("all");
	const [tourRestartToken, setTourRestartToken] = useState(0);
	const displayName = toDisplayFirstName(user?.name, user?.email);

	useEffect(() => {
		if (!loading && !user) {
			router.push("/");
		}
	}, [user, loading, router]);

	useEffect(() => {
		let isMounted = true;

		const loadCourses = async () => {
			if (!user) {
				if (isMounted) {
					setCourses([]);
					setAcademicBase(null);
					setGradingScale(null);
					setTotalDegreeCredits(DEFAULT_TOTAL_DEGREE_CREDITS);
					setTargetCgpa(null);
				}
				return;
			}

			const [userCourses, base, scale, degreeCredits, savedTargetCgpa] = await Promise.all([
				getUserCourses(user.id),
				getUserAcademicBase(user.id),
				getUserGradingScale(user.id),
				getUserTotalDegreeCredits(user.id),
				getUserTargetGpa(user.id),
			]);
			if (isMounted) {
				setCourses(userCourses);
				setAcademicBase(base);
				setGradingScale(scale);
				setTotalDegreeCredits(degreeCredits);
				setTargetCgpa(savedTargetCgpa);
			}
		};

		void loadCourses();

		return () => {
			isMounted = false;
		};
	}, [user]);

	const cgpa = calculateCGPA(courses, academicBase, gradingScale);
	const totalCredits = getTotalCredits(courses, academicBase?.baseTotalCredits || 0);
	const completedCourses = getTotalCoursesCompleted(courses);
	const inProgressCourses = getCoursesInProgress(courses);
	const inProgressCourseList = useMemo(
		() => courses.filter((course) => course.status === "in-progress"),
		[courses],
	);
	const degreeProgress = calculateDegreeProgress(totalCredits, totalDegreeCredits);
	const semesterPerformance = getSemesterPerformance(courses, gradingScale);

	const semesterOptions = useMemo(() => {
		const values = Array.from(
			new Set(courses.map((course) => `${course.semester} ${course.year}`)),
		);

		return values.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
	}, [courses]);

	const courseOptions = useMemo(() => {
		const values = Array.from(new Set(courses.map((course) => course.courseCode)));
		return values.sort((a, b) => a.localeCompare(b));
	}, [courses]);

	const filteredCourses = useMemo(
		() =>
			courses.filter((course) => {
				const semesterLabel = `${course.semester} ${course.year}`;
				const courseLevel = getCoursePerformanceLevel(course);

				const semesterMatch =
					selectedSemester === "all" || semesterLabel === selectedSemester;
				const courseMatch =
					selectedCourse === "all" || course.courseCode === selectedCourse;
				const performanceMatch =
					selectedPerformance === "all" || courseLevel === selectedPerformance;

				return semesterMatch && courseMatch && performanceMatch;
			}),
		[courses, selectedSemester, selectedCourse, selectedPerformance],
	);

	const filteredSemesterPerformance = useMemo(
		() => getSemesterPerformance(filteredCourses, gradingScale),
		[filteredCourses, gradingScale],
	);

	const semesterChartData = useMemo(
		() =>
			filteredSemesterPerformance.map((sem) => ({
				name: `${sem.semester} ${sem.year}`,
				gpa: Number(sem.gpa.toFixed(2)),
			})),
		[filteredSemesterPerformance],
	);

	const smartInsights = useMemo(
		() =>
			generatePersonalizedInsights({
				inProgressCourses: inProgressCourseList,
				targetCGPA: targetCgpa,
				gradingScale,
			}),
		[inProgressCourseList, targetCgpa, gradingScale],
	);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<span className="loading loading-spinner loading-lg" />
			</div>
		);
	}

	if (!user) return null;

	const handleExportTranscript = () => {
		setIsGeneratingPDF(true);
		try {
			downloadTranscript(user, courses, {
				includeInsights: true,
				totalDegreeCredits,
			});
		} catch (error) {
			console.error("Failed to generate PDF:", error);
		} finally {
			setIsGeneratingPDF(false);
		}
	};

	const handleSaveInProgressCourse = async (payload: {
		courseId: string;
		targetGrade?: Course["targetGrade"];
		currentScore: number;
		maxAssessmentScore: 30 | 40;
	}) => {
		const updated = await updateCourse(payload.courseId, {
			targetGrade: payload.targetGrade,
			currentScore: payload.currentScore,
			maxAssessmentScore: payload.maxAssessmentScore,
		});

		setCourses((prev) =>
			prev.map((course) => (course.id === updated.id ? updated : course)),
		);
	};

	return (
		<div className="min-h-screen bg-base-200">
			<FeatureTour userId={user.id} restartToken={tourRestartToken} />
			<Navbar
				userName={user.name}
				onHelpClick={() => setTourRestartToken((prev) => prev + 1)}
			/>

			<div className="container mx-auto p-4 px-4 sm:px-6 lg:px-8 max-w-7xl">
				<OfflineBanner />

				<div className="mb-6">
					<h1 className="text-3xl font-bold">Welcome back, {displayName}</h1>
					<p className="opacity-70 mt-1">Academic progress overview</p>
				</div>

				<div id="quick-start-card" className="card bg-base-100 shadow-xl mb-6">
					<div className="card-body">
						<h2 className="card-title">Quick Start</h2>
						<p className="text-sm opacity-70">
							Enter your current CGPA in Profile once, then continue tracking only your new courses.
						</p>
						<div className="card-actions justify-start">
							<Link href="/profile" className="btn btn-sm btn-primary">
								Open Profile Setup
							</Link>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<div className="stats stats-vertical w-full shadow h-full">
						<div className="stat">
							<div className="stat-title text-sm">Current CGPA</div>
							<div className="stat-value text-primary text-3xl">{cgpa.toFixed(2)}</div>
							<div className="stat-desc text-xs">Out of 5.0</div>
						</div>
					</div>

					<div className="stats stats-vertical w-full shadow h-full">
						<div className="stat">
							<div className="stat-title text-sm">Credits Completed</div>
							<div className="stat-value text-secondary text-3xl">{totalCredits}</div>
							<div className="stat-desc text-xs">Out of {totalDegreeCredits} total</div>
						</div>
					</div>

					<div className="stats stats-vertical w-full shadow h-full">
						<div className="stat">
							<div className="stat-title text-sm">Courses Completed</div>
							<div className="stat-value text-accent text-3xl">{completedCourses}</div>
							<div className="stat-desc text-xs">Total courses taken</div>
						</div>
					</div>

					<div className="stats stats-vertical w-full shadow h-full">
						<div className="stat">
							<div className="stat-title text-sm">In Progress</div>
							<div className="stat-value text-warning text-3xl">{inProgressCourses}</div>
							<div className="stat-desc text-xs">Current semester</div>
						</div>
					</div>
				</div>

				<div className="card bg-base-100 shadow-xl mb-6">
					<div className="card-body">
						<h2 className="card-title">Degree Progress</h2>
						<div className="flex items-center gap-4">
							<progress
								className="progress progress-primary w-full"
								value={degreeProgress}
								max="100"
							/>
							<span className="font-bold">{degreeProgress.toFixed(1)}%</span>
						</div>
						<p className="text-sm opacity-70">
							{totalCredits} of {totalDegreeCredits} credits completed
						</p>
					</div>
				</div>

				<details
					id="target-simulator-section"
					className="group card bg-base-100 shadow-xl mb-6 [&_summary::-webkit-details-marker]:hidden [&>summary]:list-none [&[open]_.chevron]:rotate-180"
				>
					<summary className="card-body cursor-pointer flex items-center justify-between gap-3 transition-colors hover:bg-base-200 hover:shadow-sm">
						<div>
							<h2 className="card-title">Advanced Planner: Target Simulator</h2>
							<p className="text-sm opacity-70">
								Set and simulate complex target scenarios.
							</p>
						</div>
						<ChevronDown className="chevron w-6 h-6 text-primary shrink-0 transition-transform duration-200 group-hover:scale-110" />
					</summary>
					<div className="card-body pt-0">
						<TargetSimulator
							userId={user.id}
							courses={courses}
							academicBase={academicBase}
							gradingScale={gradingScale}
							totalDegreeCredits={totalDegreeCredits}
						/>
					</div>
				</details>

				<details className="group card bg-base-100 shadow-xl mb-6 [&_summary::-webkit-details-marker]:hidden [&>summary]:list-none [&[open]_.chevron]:rotate-180">
					<summary className="card-body cursor-pointer flex items-center justify-between gap-3 transition-colors hover:bg-base-200 hover:shadow-sm">
						<div>
							<h2 className="card-title">Performance Trends</h2>
							<p className="text-sm opacity-70">
								View detailed charts and filters for historical performance.
							</p>
						</div>
						<ChevronDown className="chevron w-6 h-6 text-primary shrink-0 transition-transform duration-200 group-hover:scale-110" />
					</summary>
					<div className="card-body gap-4 pt-0">

						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<label className="form-control w-full">
								<span className="label-text font-medium mb-1">Semester</span>
								<select
									className="select select-bordered w-full"
									value={selectedSemester}
									onChange={(event) => setSelectedSemester(event.target.value)}
								>
									<option value="all">All semesters</option>
									{semesterOptions.map((semester) => (
										<option key={semester} value={semester}>
											{semester}
										</option>
									))}
								</select>
							</label>

							<label className="form-control w-full">
								<span className="label-text font-medium mb-1">Course</span>
								<select
									className="select select-bordered w-full"
									value={selectedCourse}
									onChange={(event) => setSelectedCourse(event.target.value)}
								>
									<option value="all">All courses</option>
									{courseOptions.map((courseCode) => (
										<option key={courseCode} value={courseCode}>
											{courseCode}
										</option>
									))}
								</select>
							</label>

							<label className="form-control w-full">
								<span className="label-text font-medium mb-1">Performance</span>
								<select
									className="select select-bordered w-full"
									value={selectedPerformance}
									onChange={(event) =>
										setSelectedPerformance(event.target.value as PerformanceLevel)
									}
								>
									<option value="all">All levels</option>
									<option value="excellent">Excellent (A / B+)</option>
									<option value="good">Good (B)</option>
									<option value="average">Average (C+ / C)</option>
									<option value="needs-improvement">Needs improvement (D+ and below)</option>
									<option value="in-progress">In progress</option>
								</select>
							</label>
						</div>

						<p className="text-sm opacity-70">
							Showing {filteredCourses.length} of {courses.length} courses based on current
							filters.
						</p>

						{semesterChartData.length > 0 ? (
							<div className="h-72 w-full text-primary">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={semesterChartData}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="name" />
										<YAxis domain={[0, 5]} />
										<Tooltip />
										<Bar dataKey="gpa" fill="currentColor" radius={[6, 6, 0, 0]} />
									</BarChart>
								</ResponsiveContainer>
							</div>
						) : (
							<p className="text-sm opacity-70">
								No completed courses match the selected filters.
							</p>
						)}

						{filteredSemesterPerformance.length > 0 && (
							<div className="overflow-x-auto">
								<table className="table table-sm">
									<thead>
										<tr>
											<th>Semester</th>
											<th>Year</th>
											<th>GPA</th>
										</tr>
									</thead>
									<tbody>
										{filteredSemesterPerformance.map((sem) => (
											<tr key={`${sem.semester}-${sem.year}`}>
												<td>{sem.semester}</td>
												<td>{sem.year}</td>
												<td>
													<span className="badge badge-primary">{sem.gpa.toFixed(2)}</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</details>

				<details className="group card bg-base-100 shadow-xl mb-6 [&_summary::-webkit-details-marker]:hidden [&>summary]:list-none [&[open]_.chevron]:rotate-180">
					<summary className="card-body cursor-pointer flex items-center justify-between gap-3 transition-colors hover:bg-base-200 hover:shadow-sm">
						<div>
							<h2 className="card-title">In-Progress Course Planner</h2>
							<p className="text-sm opacity-70">
								Track course-level targets and required exam outcomes.
							</p>
						</div>
						<ChevronDown className="chevron w-6 h-6 text-primary shrink-0 transition-transform duration-200 group-hover:scale-110" />
					</summary>
					<div className="card-body gap-4 pt-0">
						{inProgressCourseList.length > 0 ? (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
								{inProgressCourseList.map((course) => (
									<InProgressCourseCard
										key={course.id}
										courseId={course.id}
										courseCode={course.courseCode}
										targetGrade={course.targetGrade}
										currentScore={course.currentScore}
										maxAssessmentScore={course.maxAssessmentScore}
										gradingScale={gradingScale}
										onSave={handleSaveInProgressCourse}
									/>
								))}
							</div>
						) : (
							<p className="text-sm opacity-70">
								No in-progress courses yet. Add one to track exam targets.
							</p>
						)}
					</div>
				</details>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
					<div className="card bg-base-100 shadow-xl">
						<div className="card-body">
							<h2 className="card-title">Semester Performance</h2>
							{semesterPerformance.length > 0 ? (
								<div className="space-y-3">
									{semesterPerformance.slice(-5).map((sem) => (
										<div key={`${sem.semester}-${sem.year}`}>
											<div className="flex justify-between items-center mb-1">
												<span className="text-sm font-medium">
													{sem.semester} {sem.year}
												</span>
												<span className="badge badge-primary">
													{sem.gpa.toFixed(2)}
												</span>
											</div>
											<progress
												className="progress progress-primary w-full"
												value={sem.gpa}
												max="5"
											/>
										</div>
									))}
								</div>
							) : (
								<p className="opacity-70">No completed semesters yet</p>
							)}
						</div>
					</div>

					<div className="space-y-4">
						<div id="smart-advisor-card" className="card bg-info text-info-content shadow-xl">
							<div className="card-body">
								<h2 className="card-title gap-2">
									<Sparkles className="w-5 h-5" />
									Smart Advisor
								</h2>
								{smartInsights.length > 0 ? (
									<ul className="space-y-2">
										{smartInsights.map((insight, idx) => (
											<li key={idx} className="text-sm">
												• {insight}
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm">
										Add and update in-progress courses to receive Smart Advisor insights.
									</p>
								)}
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Quick Actions</h2>
								<div className="space-y-2">
									<Link
										href="/courses?action=add"
										className="btn btn-primary btn-block justify-start gap-2"
									>
										<Plus className="w-4 h-4" />
										Add New Course
									</Link>
									<Link
										href="/analysis"
										className="btn btn-secondary btn-block justify-start gap-2"
									>
										<TrendingUp className="w-4 h-4" />
										View Analysis
									</Link>
									<button
										type="button"
										onClick={handleExportTranscript}
										disabled={isGeneratingPDF || courses.length === 0}
										className="btn btn-accent btn-block justify-start gap-2"
									>
										{isGeneratingPDF ? (
											<>
												<span className="loading loading-spinner loading-sm" />
												Generating PDF...
											</>
										) : (
											<>
												<FileText className="w-4 h-4" />
												Export Transcript
											</>
										)}
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
