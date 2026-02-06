"use client";

import { FileText, Plus, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "../components/navbar";
import { useAuth } from "../lib/hooks/use-auth";
import type { Course } from "../lib/schemas/course";
import { getUserCourses } from "../lib/storage/course";
import {
	calculateCGPA,
	calculateDegreeProgress,
	generateInsights,
	getCoursesInProgress,
	getSemesterPerformance,
	getTotalCoursesCompleted,
	getTotalCredits,
} from "../lib/utils/gpa";
import { downloadTranscript } from "../lib/utils/pdf";

export default function DashboardPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
	const courses = useMemo<Course[]>(
		() => (user ? getUserCourses(user.id) : []),
		[user],
	);

	useEffect(() => {
		if (!loading && !user) {
			router.push("/");
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<span className="loading loading-spinner loading-lg" />
			</div>
		);
	}

	if (!user) return null;

	const cgpa = calculateCGPA(courses);
	const totalCredits = getTotalCredits(courses);
	const completedCourses = getTotalCoursesCompleted(courses);
	const inProgressCourses = getCoursesInProgress(courses);
	const degreeProgress = calculateDegreeProgress(totalCredits);
	const semesterPerformance = getSemesterPerformance(courses);
	const insights = generateInsights(courses);

	const handleExportTranscript = () => {
		setIsGeneratingPDF(true);
		try {
			downloadTranscript(user, courses, { includeInsights: true });
		} catch (error) {
			console.error("Failed to generate PDF:", error);
		} finally {
			setIsGeneratingPDF(false);
		}
	};

	return (
		<div className="min-h-screen bg-base-200">
			<Navbar userName={user.name} />

			<div className="container mx-auto p-4 px-4 sm:px-6 lg:px-8 max-w-7xl">
				<div className="mb-6">
					<h1 className="text-3xl font-bold">Welcome back, {user.name}</h1>
					<p className="opacity-70 mt-1">Academic progress overview</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<div className="stats shadow">
						<div className="stat">
							<div className="stat-title">Current CGPA</div>
							<div className="stat-value text-primary">{cgpa.toFixed(2)}</div>
							<div className="stat-desc">Out of 5.0</div>
						</div>
					</div>

					<div className="stats shadow">
						<div className="stat">
							<div className="stat-title">Credits Completed</div>
							<div className="stat-value text-secondary">{totalCredits}</div>
							<div className="stat-desc">Out of 120 total</div>
						</div>
					</div>

					<div className="stats shadow">
						<div className="stat">
							<div className="stat-title">Courses Completed</div>
							<div className="stat-value text-accent">{completedCourses}</div>
							<div className="stat-desc">Total courses taken</div>
						</div>
					</div>

					<div className="stats shadow">
						<div className="stat">
							<div className="stat-title">In Progress</div>
							<div className="stat-value">{inProgressCourses}</div>
							<div className="stat-desc">Current semester</div>
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
							{totalCredits} of 120 credits completed
						</p>
					</div>
				</div>

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
						<div className="card bg-info text-info-content shadow-xl">
							<div className="card-body">
								<h2 className="card-title gap-2">
									<Sparkles className="w-5 h-5" />
									AI Insights
								</h2>
								{insights.length > 0 ? (
									<ul className="space-y-2">
										{insights.map((insight, idx) => (
											<li key={idx} className="text-sm">
												• {insight}
											</li>
										))}
									</ul>
								) : (
									<p className="text-sm">
										Complete some courses to get personalized insights
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
