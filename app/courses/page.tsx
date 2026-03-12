"use client";

import { AlertCircle, Lock, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as v from "valibot";
import { Navbar } from "../components/navbar";
import { OfflineBanner } from "../components/offline-banner";
import { useAuth } from "../lib/hooks/use-auth";
import type { Course } from "../lib/schemas/course";
import { CreateCourseSchema } from "../lib/schemas/course";
import {
	createCourse,
	deleteCourse,
	getCachedUserCourses,
	getUserCourses,
	updateCourse,
} from "../lib/storage/course";
import {
	DEFAULT_CURRENT_LEVEL,
	DEFAULT_CURRENT_SEMESTER,
	getCachedUserAcademicBase,
	getCachedUserCurrentAcademicContext,
	getUserAcademicBase,
	getUserCurrentAcademicContext,
	getUserGradingScale,
	getUserTargetGpa,
	type AcademicBaseValues,
} from "../lib/storage/user";
import type { GradingScale } from "../lib/schemas/grading-scale";
import { calculateCGPA, isHistoricalForBase } from "../lib/utils/gpa";
import { calculateRequiredExamScore } from "../lib/utils/grade-prediction";

const SEMESTER_ORDER: Record<"First" | "Second" | "Summer", number> = {
	First: 1,
	Second: 2,
	Summer: 3,
};

interface GroupedSemester {
	semester: "First" | "Second" | "Summer";
	courses: Course[];
}

interface GroupedLevel {
	level: number;
	semesters: GroupedSemester[];
}

interface GroupedSession {
	session: number;
	levels: GroupedLevel[];
}

function groupCoursesBySessionLevelSemester(courses: Course[]): GroupedSession[] {
	const groupedBySession = new Map<
		number,
		Map<number, Record<"First" | "Second" | "Summer", Course[]>>
	>();

	for (const course of courses) {
		const session = course.year;
		const level = course.level ?? DEFAULT_CURRENT_LEVEL;

		if (!groupedBySession.has(session)) {
			groupedBySession.set(session, new Map());
		}

		const levels = groupedBySession.get(session)!;
		if (!levels.has(level)) {
			levels.set(level, {
				First: [],
				Second: [],
				Summer: [],
			});
		}

		levels.get(level)![course.semester].push(course);
	}

	return Array.from(groupedBySession.entries())
		.sort(([sessionA], [sessionB]) => sessionB - sessionA)
		.map(([session, levels]) => ({
			session,
			levels: Array.from(levels.entries())
				.sort(([levelA], [levelB]) => levelA - levelB)
				.map(([level, semesters]) => ({
					level,
					semesters: (Object.keys(SEMESTER_ORDER) as Array<
						"First" | "Second" | "Summer"
					>)
						.filter((semester) => semesters[semester].length > 0)
						.map((semester) => ({
							semester,
							courses: [...semesters[semester]].sort((a, b) =>
								a.courseCode.localeCompare(b.courseCode),
							),
						})),
				})),
		}));
}

export default function CoursesPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [courses, setCourses] = useState<Course[]>([]);
	const [showModal, setShowModal] = useState(false);
	const [editingCourse, setEditingCourse] = useState<Course | null>(null);
	const [error, setError] = useState("");
	const [targetGpa, setTargetGpa] = useState<number | null>(null);
	const [academicBase, setAcademicBase] = useState<AcademicBaseValues | null>(null);
	const [gradingScale, setGradingScale] = useState<GradingScale | null>(null);
	const [gpaAlert, setGpaAlert] = useState<string | null>(null);
	const [dismissedExamAlertKey, setDismissedExamAlertKey] = useState<string | null>(
		null,
	);
	const [currentLevel, setCurrentLevel] = useState<number>(DEFAULT_CURRENT_LEVEL);
	const [currentSemester, setCurrentSemester] = useState<
		"First" | "Second" | "Summer"
	>(DEFAULT_CURRENT_SEMESTER);
	const groupedCourses = useMemo(
		() => groupCoursesBySessionLevelSemester(courses),
		[courses],
	);

	const isHistoricalCourse = useCallback(
		(level: number, semester: "First" | "Second" | "Summer") => {
			if (level < currentLevel) return true;
			if (level > currentLevel) return false;
			return SEMESTER_ORDER[semester] < SEMESTER_ORDER[currentSemester];
		},
		[currentLevel, currentSemester],
	);

	const [formData, setFormData] = useState({
		courseCode: "",
		title: "",
		units: 3,
		level: DEFAULT_CURRENT_LEVEL,
		grade: "",
		targetGrade: "",
		currentScore: 0,
		maxAssessmentScore: 30 as 30 | 40,
		semester: DEFAULT_CURRENT_SEMESTER as "First" | "Second" | "Summer",
		year: new Date().getFullYear(),
		status: "in-progress" as "in-progress" | "completed",
	});

	const loadCourses = useCallback(async () => {
		if (!user) {
			setCourses([]);
			return [] as Course[];
		}

		const cachedCourses = getCachedUserCourses(user.id);
		if (cachedCourses.length > 0) {
			setCourses(cachedCourses);
		}

		const userCourses = await getUserCourses(user.id);
		setCourses(userCourses);
		return userCourses;
	}, [user]);

	useEffect(() => {
		if (!loading && !user) {
			router.push("/");
			return;
		}

		if (user) {
			void loadCourses();
		}
	}, [user, loading, router, loadCourses]);

	useEffect(() => {
		let isMounted = true;

		const loadTargetAndBase = async () => {
			if (!user) {
				if (isMounted) {
					setTargetGpa(null);
					setAcademicBase(null);
					setGradingScale(null);
					setCurrentLevel(DEFAULT_CURRENT_LEVEL);
					setCurrentSemester(DEFAULT_CURRENT_SEMESTER);
				}
				return;
			}

			const cachedBase = getCachedUserAcademicBase(user.id);
			const cachedContext = getCachedUserCurrentAcademicContext(user.id);
			if (isMounted && cachedBase) {
				setAcademicBase(cachedBase);
			}
			if (isMounted) {
				setCurrentLevel(cachedContext.currentLevel);
				setCurrentSemester(cachedContext.currentSemester);
			}

			const [target, base, scale, currentContext] = await Promise.all([
				getUserTargetGpa(user.id),
				getUserAcademicBase(user.id),
				getUserGradingScale(user.id),
				getUserCurrentAcademicContext(user.id),
			]);
			if (isMounted) {
				setTargetGpa(target);
				setAcademicBase(base);
				setGradingScale(scale);
				setCurrentLevel(currentContext.currentLevel);
				setCurrentSemester(currentContext.currentSemester);
			}
		};

		void loadTargetAndBase();

		return () => {
			isMounted = false;
		};
	}, [user]);

	const openAddModal = () => {
		setEditingCourse(null);
		setFormData({
			courseCode: "",
			title: "",
			units: 3,
			level: currentLevel,
			grade: "",
			targetGrade: "",
			currentScore: 0,
			maxAssessmentScore: 30,
			semester: currentSemester,
			year: new Date().getFullYear(),
			status: "in-progress",
		});
		setError("");
		setShowModal(true);
	};

	const openEditModal = (course: Course) => {
		setEditingCourse(course);
		setFormData({
			courseCode: course.courseCode,
			title: course.title,
			units: course.units,
			level: course.level ?? currentLevel,
			grade: course.grade || "",
			targetGrade: course.targetGrade || "",
			currentScore: course.currentScore ?? 0,
			maxAssessmentScore: course.maxAssessmentScore ?? 30,
			semester: course.semester,
			year: course.year,
			status: isHistoricalCourse(course.level ?? currentLevel, course.semester)
				? "completed"
				: course.status,
		});
		setError("");
		setShowModal(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setGpaAlert(null);

		if (!user) return;

		try {
			const historicalByContext = isHistoricalCourse(
				formData.level,
				formData.semester,
			);
			const previousCgpa = calculateCGPA(
				courses,
				academicBase,
				gradingScale,
				undefined,
				currentLevel,
				currentSemester,
			);

			if (
				formData.status === "in-progress" &&
				formData.currentScore > formData.maxAssessmentScore
			) {
				setError("Current score cannot exceed max assessment score.");
				return;
			}

			const data = v.parse(CreateCourseSchema, {
				...formData,
				status: historicalByContext ? "completed" : formData.status,
				grade: formData.grade || undefined,
				targetGrade: formData.targetGrade || undefined,
			});

			if (editingCourse) {
				await updateCourse(editingCourse.id, data);
			} else {
				await createCourse(user.id, data);
			}

			setShowModal(false);
			const coursesAfterSave = await loadCourses();

			if (targetGpa !== null) {
				const newCgpa = calculateCGPA(
					coursesAfterSave,
					academicBase,
					gradingScale,
					undefined,
					currentLevel,
					currentSemester,
				);

				if (previousCgpa >= targetGpa && newCgpa < targetGpa) {
					setGpaAlert(
						`Performance alert: Your CGPA dropped from ${previousCgpa.toFixed(2)} to ${newCgpa.toFixed(2)}, below your target GPA of ${targetGpa.toFixed(2)}.`,
					);
				}
			}
		} catch (err) {
			if (err instanceof v.ValiError) {
				setError(err.issues[0].message);
			} else if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Failed to save course");
			}
		}
	};

	const handleDelete = async (courseId: string) => {
		if (confirm("Are you sure you want to delete this course?")) {
			try {
				await deleteCourse(courseId);
				await loadCourses();
			} catch {
				alert("Failed to delete course");
			}
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<span className="loading loading-spinner loading-lg" />
			</div>
		);
	}

	if (!user) return null;

	const isHistoricalSelection = isHistoricalCourse(formData.level, formData.semester);

	const maxExamScore = 100 - formData.maxAssessmentScore;
	const examPrediction =
		formData.status === "in-progress" &&
		formData.targetGrade
			? calculateRequiredExamScore({
					targetGrade: formData.targetGrade,
					currentScore: formData.currentScore,
					maxExamScore,
					gradingScale,
			  })
			: null;

	const examPredictionAlertKey =
		examPrediction && examPrediction.success && formData.targetGrade
			? JSON.stringify({
					targetGrade: formData.targetGrade,
					currentScore: formData.currentScore,
					maxAssessmentScore: formData.maxAssessmentScore,
					requiredExamScore: examPrediction.requiredExamScore ?? null,
					isTargetAchievable: examPrediction.isTargetAchievable,
					suggestionGrade: examPrediction.suggestion?.grade ?? null,
					suggestionRequiredScore:
						examPrediction.suggestion?.requiredExamScore ?? null,
			  })
			: null;

	const shouldShowExamPredictionAlert =
		examPredictionAlertKey !== null &&
		dismissedExamAlertKey !== examPredictionAlertKey;

	const clearExamPredictionAlert = () => {
		if (!examPredictionAlertKey) return;
		setDismissedExamAlertKey(examPredictionAlertKey);
	};

	return (
		<div className="min-h-screen bg-base-200">
			<Navbar userName={user.name} />

			<div className="container mx-auto p-4 px-4 sm:px-6 lg:px-8 max-w-7xl">
				<OfflineBanner />

				<div className="flex justify-between items-center mb-6">
					<div>
						<h1 className="text-3xl font-bold">My Courses</h1>
						<p className="opacity-70 mt-1">Manage your academic courses</p>
					</div>
					<button
						type="button"
						onClick={openAddModal}
						className="btn btn-primary gap-2"
					>
						<Plus className="w-4 h-4" />
						Add Course
					</button>
				</div>

				{gpaAlert && (
					<div role="alert" className="alert alert-warning mb-6">
						<AlertCircle className="h-6 w-6 shrink-0" />
						<span>{gpaAlert}</span>
					</div>
				)}

				{courses.length === 0 ? (
					<div className="card bg-base-100 shadow-xl">
						<div className="card-body text-center py-12">
							<p className="text-lg opacity-70">No courses yet</p>
							<p className="text-sm opacity-50">
								Click &quot;Add Course&quot; to get started
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-6">
						{groupedCourses.map((sessionGroup) => (
							<div key={sessionGroup.session} className="card bg-base-100 shadow-xl">
								<div className="card-body">
									<h2 className="card-title text-xl sm:text-2xl mb-4">
										Session {sessionGroup.session}
									</h2>
									<div className="space-y-6">
										{sessionGroup.levels.map((levelGroup) => (
											<div
												key={`${sessionGroup.session}-${levelGroup.level}`}
												className="space-y-4"
											>
												<h3 className="text-lg font-semibold">{levelGroup.level} Level</h3>

												{levelGroup.semesters.map((semesterGroup) => (
													<div
														key={`${sessionGroup.session}-${levelGroup.level}-${semesterGroup.semester}`}
														className="space-y-3"
													>
														<h4 className="font-medium">
															{semesterGroup.semester} Semester
														</h4>
														<div className="overflow-x-auto">
															<table className="table">
																<thead>
																	<tr>
																		<th>Code</th>
																		<th>Title</th>
																		<th>Units</th>
																		<th>Level</th>
																		<th>Grade</th>
																		<th>Status</th>
																		<th>In-Progress Prediction</th>
																		<th>Actions</th>
																	</tr>
																</thead>
																<tbody>
																	{semesterGroup.courses.map((course) => (
																		<tr key={course.id}>
																			<td className="font-medium">{course.courseCode}</td>
																			<td>{course.title}</td>
																			<td>{course.units}</td>
																			<td>{course.level ?? "-"}</td>
																			<td>
																				{course.grade ? (
																					<span className="badge badge-primary">
																						{course.grade}
																					</span>
																				) : (
																					<span className="opacity-50">-</span>
																				)}
																			</td>
																			<td>
																				{course.status === "completed" ? (
																					<div className="flex flex-wrap items-center gap-2">
																						<span className="badge badge-success gap-1 whitespace-nowrap">
																							{isHistoricalCourse(course.level ?? currentLevel, course.semester) && (
																								<Lock className="w-3 h-3" />
																							)}
																							Completed
																						</span>
																						{isHistoricalForBase(
																							course.level,
																							course.semester,
																							currentLevel,
																							currentSemester,
																							(academicBase?.baseTotalCredits ?? 0) > 0,
																						) && (
																							<span
																								className="badge badge-outline badge-info whitespace-nowrap"
																								title="This historical course is already included in your Quick Start base and does not change your live CGPA."
																							>
																								Included in Quick Start Base
																							</span>
																						)}
																					</div>
																				) : (
																					<span className="badge badge-warning whitespace-nowrap">
																						In Progress
																					</span>
																				)}
																			</td>
																			<td className="max-w-xs">
																				{course.status === "in-progress" &&
																				course.targetGrade ? (
																					(() => {
																						const prediction = calculateRequiredExamScore({
																							targetGrade: course.targetGrade,
																							currentScore: course.currentScore ?? 0,
																							maxExamScore: 100 - (course.maxAssessmentScore ?? 30),
																							gradingScale,
																						});

																						if (!prediction.success) {
																							return (
																								<span className="text-xs text-error">Invalid prediction</span>
																							);
																						}

																						if (prediction.isTargetAchievable) {
																							return (
																								<div className="text-xs">
																									<div className="font-medium">
																										Need {prediction.requiredExamScore?.toFixed(2)} / {100 - (course.maxAssessmentScore ?? 30)}
																									</div>
																									<div className="opacity-70">for target {course.targetGrade}</div>
																								</div>
																							);
																						}

																						return (
																							<div className="text-xs text-warning">
																								<div className="font-medium">Target {course.targetGrade} not reachable</div>
																								{prediction.suggestion ? (
																									<div>
																										Try {prediction.suggestion.grade}: {prediction.suggestion.requiredExamScore.toFixed(2)} / {100 - (course.maxAssessmentScore ?? 30)}
																									</div>
																								) : (
																									<div>No lower grade target achievable.</div>
																								)}
																							</div>
																						);
																					})()
																				) : (
																					<span className="text-xs opacity-70">-</span>
																				)}
																			</td>
																			<td>
																				<div className="flex flex-wrap gap-2">
																					<button
																						type="button"
																						onClick={() => openEditModal(course)}
																						className="btn btn-sm btn-ghost"
																					>
																						Edit
																					</button>
																					<button
																						type="button"
																						onClick={() => void handleDelete(course.id)}
																						className="btn btn-sm btn-error btn-ghost"
																					>
																						Delete
																					</button>
																				</div>
																			</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													</div>
												))}
											</div>
										))}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{showModal && (
				<dialog className="modal modal-open">
					<div className="modal-box max-w-2xl">
						<h3 className="font-bold text-lg mb-4">
							{editingCourse ? "Edit Course" : "Add New Course"}
						</h3>

						{error && (
							<div role="alert" className="alert alert-error mb-4">
								<AlertCircle className="h-6 w-6 shrink-0" />
								<span>{error}</span>
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label htmlFor="course-code-input" className="label">
									<span className="label-text">Course Code</span>
								</label>
								<input
									id="course-code-input"
									type="text"
									className="input input-bordered w-full"
									placeholder="e.g. CS101"
									value={formData.courseCode}
									onChange={(e) =>
										setFormData({ ...formData, courseCode: e.target.value })
									}
									required
								/>
							</div>

							<div>
								<label htmlFor="course-title-input" className="label">
									<span className="label-text">Course Title</span>
								</label>
								<input
									id="course-title-input"
									type="text"
									className="input input-bordered w-full"
									placeholder="e.g. Introduction to Computer Science"
									value={formData.title}
									onChange={(e) =>
										setFormData({ ...formData, title: e.target.value })
									}
									required
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label htmlFor="units-input" className="label">
										<span className="label-text">Units</span>
									</label>
									<input
										id="units-input"
										type="number"
										className="input input-bordered w-full"
										value={formData.units}
										onFocus={(e) => e.target.select()}
										onChange={(e) =>
											setFormData({
												...formData,
												units: Number(e.target.value),
											})
										}
										min={1}
										max={10}
										required
									/>
								</div>

								<div>
									<label htmlFor="level-input" className="label">
										<span className="label-text">Level</span>
									</label>
									<input
										id="level-input"
										type="number"
										className="input input-bordered w-full"
										value={formData.level}
										onFocus={(e) => e.target.select()}
										onChange={(e) => {
											const nextLevel = Number(e.target.value);
											setFormData((prev) => {
												const forcedCompleted = isHistoricalCourse(
													nextLevel,
													prev.semester,
												);
												return {
													...prev,
													level: nextLevel,
													status: forcedCompleted ? "completed" : prev.status,
												};
											});
										}}
										min={100}
										max={900}
										step={100}
										required
									/>
								</div>

								<div>
									<label htmlFor="grade-select" className="label">
										<span className="label-text">Grade</span>
									</label>
									<select
										id="grade-select"
										className="select select-bordered w-full"
										value={formData.grade}
										onChange={(e) =>
											setFormData({ ...formData, grade: e.target.value })
										}
									>
										<option value="">No Grade</option>
										<option value="A">A</option>
										<option value="B">B</option>
										<option value="C">C</option>
										<option value="D">D</option>
										<option value="E">E</option>
										<option value="F">F</option>
									</select>
								</div>
							</div>

							{formData.status === "in-progress" && (
								<div className="card bg-base-200">
									<div className="card-body p-4 space-y-4">
										<h4 className="font-semibold">In-Progress Target Tracking</h4>

										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
											<div>
												<label htmlFor="target-grade-select" className="label">
													<span className="label-text">Target Grade</span>
												</label>
												<select
													id="target-grade-select"
													className="select select-bordered w-full"
													value={formData.targetGrade}
													onChange={(e) =>
														setFormData({ ...formData, targetGrade: e.target.value })
													}
												>
													<option value="">No target</option>
													<option value="A">A</option>
													<option value="B">B</option>
													<option value="C">C</option>
													<option value="D">D</option>
													<option value="E">E</option>
													<option value="F">F</option>
												</select>
											</div>

											<div>
												<label htmlFor="current-score-input" className="label">
													<span className="label-text">Current Score (CA)</span>
												</label>
												<input
													id="current-score-input"
													type="number"
													className="input input-bordered w-full"
													value={formData.currentScore}
													onChange={(e) =>
														setFormData({
															...formData,
															currentScore: Number(e.target.value),
														})
													}
													min={0}
													max={formData.maxAssessmentScore}
												/>
											</div>

											<div>
												<label htmlFor="max-assessment-select" className="label">
													<span className="label-text">Max Assessment Score</span>
												</label>
												<select
													id="max-assessment-select"
													className="select select-bordered w-full"
													value={formData.maxAssessmentScore}
													onChange={(e) =>
														setFormData({
															...formData,
															maxAssessmentScore: Number(e.target.value) as 30 | 40,
														})
													}
												>
													<option value={30}>30</option>
													<option value={40}>40</option>
												</select>
											</div>
										</div>

										{examPrediction &&
											examPrediction.success &&
											formData.targetGrade &&
											shouldShowExamPredictionAlert && (
											<div className="text-sm">
												{examPrediction.isTargetAchievable ? (
													<div className="alert alert-info py-2">
														<div className="flex w-full items-start justify-between gap-3">
															<span>
																Need {examPrediction.requiredExamScore?.toFixed(2)} / {maxExamScore} in the final exam to reach {formData.targetGrade}.
															</span>
															<button
																type="button"
																className="btn btn-ghost btn-xs"
																onClick={clearExamPredictionAlert}
															>
																Clear
															</button>
														</div>
													</div>
												) : (
													<div className="alert alert-warning py-2">
														<div className="flex w-full items-start justify-between gap-3">
															<span>
																Target {formData.targetGrade} needs {examPrediction.requiredExamScore?.toFixed(2)} / {maxExamScore}, which is above max exam score.
																{examPrediction.suggestion
																	? ` Try ${examPrediction.suggestion.grade} with ${examPrediction.suggestion.requiredExamScore.toFixed(2)} / ${maxExamScore}.`
																	: ""}
															</span>
															<button
																type="button"
																className="btn btn-ghost btn-xs"
																onClick={clearExamPredictionAlert}
															>
																Clear
															</button>
														</div>
													</div>
												)}
											</div>
										)}
									</div>
								</div>
							)}

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label htmlFor="semester-select" className="label">
										<span className="label-text">Semester</span>
									</label>
									<select
										id="semester-select"
										className="select select-bordered w-full"
										value={formData.semester}
										onChange={(e) => {
											const nextSemester = e.target.value as
												| "First"
												| "Second"
												| "Summer";
											setFormData((prev) => {
												const forcedCompleted = isHistoricalCourse(
													prev.level,
													nextSemester,
												);
												return {
													...prev,
													semester: nextSemester,
													status: forcedCompleted ? "completed" : prev.status,
												};
											});
										}}
										required
									>
										<option value="First">First</option>
										<option value="Second">Second</option>
										<option value="Summer">Summer</option>
									</select>
								</div>

								<div>
									<label htmlFor="year-input" className="label">
										<span className="label-text">Year</span>
									</label>
									<input
										id="year-input"
										type="number"
										className="input input-bordered w-full"
										value={formData.year}
										onFocus={(e) => e.target.select()}
										onChange={(e) =>
											setFormData({
												...formData,
												year: Number(e.target.value),
											})
										}
										min={2000}
										max={2100}
										required
									/>
								</div>
							</div>

							<div>
								<label htmlFor="status-select" className="label">
									<span className="label-text">Status</span>
								</label>
								<select
									id="status-select"
									className="select select-bordered w-full"
									value={isHistoricalSelection ? "completed" : formData.status}
									onChange={(e) =>
										setFormData({
											...formData,
											status: e.target.value as "in-progress" | "completed",
										})
									}
									disabled={isHistoricalSelection}
									required
								>
									<option value="in-progress">In Progress</option>
									<option value="completed">Completed</option>
								</select>
								{isHistoricalSelection && (
									<p className="text-xs opacity-70 mt-1 flex items-center gap-1">
										<Lock className="w-3 h-3" />
										Historical courses are locked to Completed.
									</p>
								)}
							</div>

							<div className="modal-action">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="btn"
								>
									Cancel
								</button>
								<button type="submit" className="btn btn-primary">
									{editingCourse ? "Update" : "Add"} Course
								</button>
							</div>
						</form>
					</div>
					<form method="dialog" className="modal-backdrop">
						<button type="button" onClick={() => setShowModal(false)}>
							close
						</button>
					</form>
				</dialog>
			)}
		</div>
	);
}
