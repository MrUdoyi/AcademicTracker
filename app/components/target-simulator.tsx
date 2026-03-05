"use client";

import { useEffect, useMemo, useState } from "react";
import type { Course } from "../lib/schemas/course";
import type { GradingScale } from "../lib/schemas/grading-scale";
import { normalizeGradingScale } from "../lib/schemas/grading-scale";
import { getUserTargetGpa, setUserTargetGpa, type AcademicBaseValues } from "../lib/storage/user";
import {
	calculateMaxAchievableCGPA,
	calculateRequiredSemesterGPA,
	gradeToPoints,
} from "../lib/utils/gpa";
import {
	suggestCourseGrades,
	type SuggestedCourseGrade,
	type InProgressCourseForSuggestion,
} from "../lib/utils/grade-suggestions";

interface TargetSimulatorProps {
	userId: string;
	courses: Course[];
	academicBase?: AcademicBaseValues | null;
	gradingScale?: GradingScale | null;
	totalDegreeCredits: number;
}

type OverrideMap = Record<string, string>;

function toFixed2(value: number): number {
	return Number(value.toFixed(2));
}

export function TargetSimulator({
	userId,
	courses,
	academicBase,
	gradingScale,
	totalDegreeCredits,
}: TargetSimulatorProps) {
	const normalizedScale = useMemo(
		() => normalizeGradingScale(gradingScale),
		[gradingScale],
	);
	const maxScaleWeight = normalizedScale[0]?.weight ?? 5;

	const [targetInput, setTargetInput] = useState("");
	const [savedTarget, setSavedTarget] = useState<number | null>(null);
	const [savingTarget, setSavingTarget] = useState(false);
	const [targetMessage, setTargetMessage] = useState<string | null>(null);
	const [targetError, setTargetError] = useState<string | null>(null);
	const [overrides, setOverrides] = useState<OverrideMap>({});

	useEffect(() => {
		let isMounted = true;

		const loadTarget = async () => {
			const value = await getUserTargetGpa(userId);
			if (!isMounted) return;
			setSavedTarget(value);
			setTargetInput(value !== null ? value.toFixed(2) : "");
		};

		void loadTarget();

		return () => {
			isMounted = false;
		};
	}, [userId]);

	const parsedTarget = useMemo(() => {
		const trimmed = targetInput.trim();
		if (!trimmed) return null;
		const numeric = Number(trimmed);
		if (!Number.isFinite(numeric)) return null;
		return numeric;
	}, [targetInput]);

	const inProgressCourses = useMemo(
		() => courses.filter((course) => course.status === "in-progress"),
		[courses],
	);

	const completedCourses = useMemo(
		() => courses.filter((course) => course.status === "completed" && course.grade),
		[courses],
	);

	const pastCredits = useMemo(() => {
		const baseCredits = academicBase?.baseTotalCredits ?? 0;
		const completedCredits = completedCourses.reduce(
			(sum, course) => sum + course.units,
			0,
		);
		return baseCredits + completedCredits;
	}, [academicBase?.baseTotalCredits, completedCourses]);

	const pastCgpa = useMemo(() => {
		const baseCredits = academicBase?.baseTotalCredits ?? 0;
		const basePoints = (academicBase?.baseCgpa ?? 0) * baseCredits;
		const completedPoints = completedCourses.reduce((sum, course) => {
			if (!course.grade) return sum;
			return sum + gradeToPoints(course.grade, normalizedScale) * course.units;
		}, 0);
		const totalCredits = baseCredits + completedCourses.reduce((sum, c) => sum + c.units, 0);
		if (totalCredits === 0) return 0;
		return toFixed2((basePoints + completedPoints) / totalCredits);
	}, [academicBase?.baseCgpa, academicBase?.baseTotalCredits, completedCourses, normalizedScale]);

	const currentSemesterCredits = useMemo(
		() => inProgressCourses.reduce((sum, course) => sum + course.units, 0),
		[inProgressCourses],
	);

	const requiredSemester = useMemo(() => {
		if (parsedTarget === null) return null;
		return calculateRequiredSemesterGPA({
			targetCGPA: parsedTarget,
			pastCGPA: pastCgpa,
			pastTotalCredits: pastCredits,
			currentSemesterCredits,
			gradingScale: normalizedScale,
		});
	}, [parsedTarget, pastCgpa, pastCredits, currentSemesterCredits, normalizedScale]);

	const maxAchievable = useMemo(() => {
		return calculateMaxAchievableCGPA({
			pastCGPA: pastCgpa,
			pastTotalCredits: pastCredits,
			totalDegreeCredits,
			gradingScale: normalizedScale,
		});
	}, [pastCgpa, pastCredits, totalDegreeCredits, normalizedScale]);

	const shouldShowOutOfReachWarning =
		parsedTarget !== null &&
		maxAchievable.success &&
		maxAchievable.maxAchievableCGPA !== undefined &&
		parsedTarget > maxAchievable.maxAchievableCGPA;

	const baseSuggestions = useMemo(() => {
		if (!requiredSemester?.success || requiredSemester.requiredSemesterGPA === undefined) {
			return null;
		}

		const suggestionInput: InProgressCourseForSuggestion[] = inProgressCourses.map((course) => ({
			id: course.id,
			courseCode: course.courseCode,
			units: course.units,
		}));

		return suggestCourseGrades({
			requiredSemesterGPA: requiredSemester.requiredSemesterGPA,
			inProgressCourses: suggestionInput,
			gradingScale: normalizedScale,
		});
	}, [requiredSemester, inProgressCourses, normalizedScale]);

	const suggestionByCourse = useMemo(() => {
		if (!baseSuggestions?.success || !baseSuggestions.suggestions) return [] as SuggestedCourseGrade[];

		const baseList = [...baseSuggestions.suggestions];
		if (Object.keys(overrides).length === 0) return baseList;

		const byGrade = new Map(normalizedScale.map((item) => [item.grade, item.weight]));
		const requiredSemesterGPA = requiredSemester?.requiredSemesterGPA ?? 0;
		const totalCredits = baseList.reduce((sum, item) => sum + item.units, 0);
		const lockedCourseIds = new Set(Object.keys(overrides));

		const locked = baseList
			.filter((item) => item.id && lockedCourseIds.has(item.id))
			.map((item) => {
				const overrideGrade = item.id ? overrides[item.id] : undefined;
				const overrideWeight = overrideGrade ? byGrade.get(overrideGrade) : undefined;
				return {
					...item,
					targetGrade: overrideGrade || item.targetGrade,
					targetGradeWeight: overrideWeight ?? item.targetGradeWeight,
				};
			});

		const unlocked = baseList.filter(
			(item) => !item.id || !lockedCourseIds.has(item.id),
		);

		const lockedPoints = locked.reduce(
			(sum, item) => sum + item.targetGradeWeight * item.units,
			0,
		);
		const lockedCredits = locked.reduce((sum, item) => sum + item.units, 0);
		const remainingCredits = totalCredits - lockedCredits;

		if (remainingCredits <= 0 || unlocked.length === 0) {
			return [...locked, ...unlocked];
		}

		const requiredRemainingGpa =
			(requiredSemesterGPA * totalCredits - lockedPoints) / remainingCredits;

		const redistributed = suggestCourseGrades({
			requiredSemesterGPA: requiredRemainingGpa,
			inProgressCourses: unlocked.map((item) => ({
				id: item.id,
				courseCode: item.courseCode,
				units: item.units,
			})),
			gradingScale: normalizedScale,
		});

		if (!redistributed.success || !redistributed.suggestions) {
			return [...locked, ...unlocked];
		}

		return [...locked, ...redistributed.suggestions].sort((a, b) => b.units - a.units);
	}, [baseSuggestions, overrides, normalizedScale, requiredSemester?.requiredSemesterGPA]);

	const projectedSemesterGpa = useMemo(() => {
		if (suggestionByCourse.length === 0) return null;
		const totalUnits = suggestionByCourse.reduce((sum, item) => sum + item.units, 0);
		if (totalUnits === 0) return null;
		const points = suggestionByCourse.reduce(
			(sum, item) => sum + item.targetGradeWeight * item.units,
			0,
		);
		return toFixed2(points / totalUnits);
	}, [suggestionByCourse]);

	const projectedCgpa = useMemo(() => {
		if (projectedSemesterGpa === null) return null;
		const allCredits = pastCredits + currentSemesterCredits;
		if (allCredits === 0) return null;
		const points = pastCgpa * pastCredits + projectedSemesterGpa * currentSemesterCredits;
		return toFixed2(points / allCredits);
	}, [projectedSemesterGpa, pastCgpa, pastCredits, currentSemesterCredits]);

	const targetMustExceedCurrentCgpa =
		parsedTarget !== null && parsedTarget < pastCgpa;

	const handleSaveTarget = async () => {
		setTargetError(null);
		setTargetMessage(null);

		const trimmed = targetInput.trim();
		if (!trimmed) {
			setSavingTarget(true);
			try {
				await setUserTargetGpa(userId, null);
				setSavedTarget(null);
				setTargetMessage("Target CGPA cleared.");
			} catch (error) {
				setTargetError(error instanceof Error ? error.message : "Failed to clear target.");
			} finally {
				setSavingTarget(false);
			}
			return;
		}

		if (parsedTarget === null || parsedTarget < 0 || parsedTarget > maxScaleWeight) {
			setTargetError(
				`Target CGPA must be between 0.00 and ${maxScaleWeight.toFixed(2)}.`,
			);
			return;
		}

		if (parsedTarget < pastCgpa) {
			setTargetError(
				`Your target CGPA cannot be lower than your current CGPA of ${pastCgpa.toFixed(2)}.`,
			);
			return;
		}

		setSavingTarget(true);
		try {
			const normalized = toFixed2(parsedTarget);
			await setUserTargetGpa(userId, normalized);
			setSavedTarget(normalized);
			setTargetInput(normalized.toFixed(2));
			setTargetMessage("Target CGPA saved.");
		} catch (error) {
			setTargetError(error instanceof Error ? error.message : "Failed to save target.");
		} finally {
			setSavingTarget(false);
		}
	};

	const handleOverrideChange = (courseId: string | undefined, grade: string) => {
		if (!courseId) return;
		setOverrides((prev) => {
			if (!grade) {
				const next = { ...prev };
				delete next[courseId];
				return next;
			}
			return { ...prev, [courseId]: grade };
		});
	};

	const handleAutoAdjustTarget = async () => {
		if (!maxAchievable.success || maxAchievable.maxAchievableCGPA === undefined) return;

		setTargetError(null);
		setTargetMessage(null);
		setSavingTarget(true);

		try {
			const adjusted = toFixed2(maxAchievable.maxAchievableCGPA);
			await setUserTargetGpa(userId, adjusted);
			setSavedTarget(adjusted);
			setTargetInput(adjusted.toFixed(2));
			setTargetMessage("Target CGPA auto-adjusted to your maximum possible outcome.");
		} catch (error) {
			setTargetError(
				error instanceof Error ? error.message : "Failed to auto-adjust target.",
			);
		} finally {
			setSavingTarget(false);
		}
	};

	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body gap-4">
				<h2 className="card-title">Target Simulator</h2>
				<p className="text-sm opacity-70">
					Set your global target CGPA and simulate required semester performance.
				</p>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
					<div className="md:col-span-2">
						<label className="label" htmlFor="target-cgpa-input">
							<span className="label-text font-medium">Global Target CGPA</span>
						</label>
						<input
							id="target-cgpa-input"
							type="number"
							className="input input-bordered w-full"
							min={0}
							max={maxScaleWeight}
							step={0.01}
							placeholder="e.g. 4.50"
							value={targetInput}
							onChange={(event) => setTargetInput(event.target.value)}
						/>
						{targetMustExceedCurrentCgpa && (
							<p className="text-sm text-red-500 mt-1">
								Your target CGPA cannot be lower than your current CGPA of {pastCgpa.toFixed(2)}.
							</p>
						)}
					</div>
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => void handleSaveTarget()}
						disabled={savingTarget || targetMustExceedCurrentCgpa}
					>
						{savingTarget ? "Saving..." : "Save Target"}
					</button>
				</div>

				{savedTarget !== null && (
					<p className="text-xs opacity-70">Saved target: {savedTarget.toFixed(2)}</p>
				)}

				{targetError && <p className="text-sm text-error">{targetError}</p>}
				{targetMessage && <p className="text-sm text-success">{targetMessage}</p>}

				{shouldShowOutOfReachWarning && (
					<div role="alert" className="alert alert-warning">
						<div className="space-y-2">
							<p className="text-sm">
								Based on your remaining credits, a {parsedTarget?.toFixed(2)} is mathematically out of reach. If you score perfect A&apos;s from now until graduation, the highest you can achieve is a {maxAchievable.maxAchievableCGPA?.toFixed(2)}.
							</p>
							<button
								type="button"
								className="btn btn-sm btn-warning"
								onClick={() => void handleAutoAdjustTarget()}
								disabled={savingTarget}
							>
								{savingTarget
									? "Adjusting..."
									: "Auto-Adjust Target to Maximum Possible"}
							</button>
						</div>
					</div>
				)}

				{requiredSemester?.success && requiredSemester.requiredSemesterGPA !== undefined ? (
					requiredSemester.isTargetAchievable ? (
						<p className="text-sm">
							To hit your goal of {toFixed2(parsedTarget ?? 0).toFixed(2)}, you need a {requiredSemester.requiredSemesterGPA.toFixed(2)} GPA this semester.
						</p>
					) : (
						<p className="text-sm text-warning">
							To hit your goal of {toFixed2(parsedTarget ?? 0).toFixed(2)}, you would need a {requiredSemester.requiredSemesterGPA.toFixed(2)} GPA this semester, which is above your scale maximum of {requiredSemester.maxPossibleSemesterGPA?.toFixed(2)}.
							 Best possible CGPA after this semester is {requiredSemester.maxRealisticCGPA?.toFixed(2)}.
						</p>
					)
				) : (
					<p className="text-sm opacity-70">
						Set a valid target CGPA and ensure you have in-progress courses to run the simulator.
					</p>
				)}

				{suggestionByCourse.length > 0 && (
					<div className="space-y-3">
						<h3 className="font-semibold">Suggested Target Grades</h3>
						<div className="overflow-x-auto">
							<table className="table table-sm">
								<thead>
									<tr>
										<th>Course</th>
										<th>Units</th>
										<th>Suggested Grade</th>
									</tr>
								</thead>
								<tbody>
									{suggestionByCourse.map((item) => (
										<tr key={item.id || item.courseCode}>
											<td>{item.courseCode}</td>
											<td>{item.units}</td>
											<td>
												<select
													className="select select-bordered select-sm w-full max-w-32"
													value={overrides[item.id || ""] || item.targetGrade}
													onChange={(event) =>
														handleOverrideChange(item.id, event.target.value)
													}
												>
													<option value="">Auto</option>
													{normalizedScale.map((scaleItem) => (
														<option key={scaleItem.grade} value={scaleItem.grade}>
															{scaleItem.grade}
														</option>
													))}
												</select>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{projectedSemesterGpa !== null && (
							<p className="text-sm">
								Projected semester GPA with current selections: {projectedSemesterGpa.toFixed(2)}
							</p>
						)}

						{projectedCgpa !== null && (
							<p className="text-sm opacity-80">
								Projected global CGPA after this semester: {projectedCgpa.toFixed(2)}
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
