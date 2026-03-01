"use client";

import { AlertCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GradingScaleConfig } from "../components/grading-scale-config";
import { Navbar } from "../components/navbar";
import { OfflineBanner } from "../components/offline-banner";
import { useAuth } from "../lib/hooks/use-auth";
import type { Course } from "../lib/schemas/course";
import type { GradingScale } from "../lib/schemas/grading-scale";
import { normalizeGradingScale } from "../lib/schemas/grading-scale";
import { getUserCourses } from "../lib/storage/course";
import {
	DEFAULT_TOTAL_DEGREE_CREDITS,
	getUserAcademicBase,
	getUserGradingScale,
	getUserTargetGpa,
	getUserTotalDegreeCredits,
	setUserAcademicBase,
	setUserTotalDegreeCredits,
	setUserTargetGpa,
	type AcademicBaseValues,
} from "../lib/storage/user";
import {
	calculateCGPA,
	getTotalCoursesCompleted,
	getTotalCredits,
} from "../lib/utils/gpa";

export default function ProfilePage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [courses, setCourses] = useState<Course[]>([]);
	const [targetGpa, setTargetGpa] = useState<number | null>(null);
	const [targetGpaInput, setTargetGpaInput] = useState("");
	const [goalMessage, setGoalMessage] = useState<string | null>(null);
	const [goalError, setGoalError] = useState<string | null>(null);
	const [isSavingGoal, setIsSavingGoal] = useState(false);
	const [academicBase, setAcademicBase] = useState<AcademicBaseValues | null>(null);
	const [gradingScale, setGradingScale] = useState<GradingScale | null>(null);
	const [baseCgpaInput, setBaseCgpaInput] = useState("");
	const [baseCreditsInput, setBaseCreditsInput] = useState("");
	const [baseMessage, setBaseMessage] = useState<string | null>(null);
	const [baseError, setBaseError] = useState<string | null>(null);
	const [isSavingBase, setIsSavingBase] = useState(false);
	const [totalDegreeCredits, setTotalDegreeCredits] = useState<number>(
		DEFAULT_TOTAL_DEGREE_CREDITS,
	);
	const [totalDegreeCreditsInput, setTotalDegreeCreditsInput] = useState("");
	const [degreeCreditsMessage, setDegreeCreditsMessage] = useState<string | null>(
		null,
	);
	const [degreeCreditsError, setDegreeCreditsError] = useState<string | null>(null);
	const [isSavingDegreeCredits, setIsSavingDegreeCredits] = useState(false);

	useEffect(() => {
		if (!loading && !user) {
			router.push("/");
		}
	}, [user, loading, router]);

	useEffect(() => {
		let isMounted = true;

		const loadCourses = async () => {
			if (!user) {
				if (isMounted) setCourses([]);
				return;
			}

			const userCourses = await getUserCourses(user.id);
			if (isMounted) setCourses(userCourses);
		};

		void loadCourses();

		return () => {
			isMounted = false;
		};
	}, [user]);

	useEffect(() => {
		let isMounted = true;

		const loadAcademicBase = async () => {
			if (!user) {
				if (isMounted) {
					setAcademicBase(null);
					setGradingScale(null);
					setTotalDegreeCredits(DEFAULT_TOTAL_DEGREE_CREDITS);
					setTotalDegreeCreditsInput(String(DEFAULT_TOTAL_DEGREE_CREDITS));
					setBaseCgpaInput("");
					setBaseCreditsInput("");
				}
				return;
			}

			const [base, scale, degreeCredits] = await Promise.all([
				getUserAcademicBase(user.id),
				getUserGradingScale(user.id),
				getUserTotalDegreeCredits(user.id),
			]);
			if (!isMounted) return;

			setAcademicBase(base);
			setGradingScale(scale);
			setTotalDegreeCredits(degreeCredits);
			setTotalDegreeCreditsInput(String(degreeCredits));
			setBaseCgpaInput(base ? base.baseCgpa.toFixed(2) : "");
			setBaseCreditsInput(base ? String(base.baseTotalCredits) : "");
		};

		void loadAcademicBase();

		return () => {
			isMounted = false;
		};
	}, [user]);

	useEffect(() => {
		let isMounted = true;

		const loadTarget = async () => {
			if (!user) {
				if (isMounted) {
					setTargetGpa(null);
					setTargetGpaInput("");
				}
				return;
			}

			const value = await getUserTargetGpa(user.id);
			if (!isMounted) return;

			setTargetGpa(value);
			setTargetGpaInput(value !== null ? value.toFixed(2) : "");
		};

		void loadTarget();

		return () => {
			isMounted = false;
		};
	}, [user]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<span className="loading loading-spinner loading-lg" />
			</div>
		);
	}

	if (!user) return null;

	const cgpa = calculateCGPA(courses, academicBase, gradingScale);
	const maxScaleWeight = normalizeGradingScale(gradingScale)[0]?.weight ?? 5;
	const totalCredits = getTotalCredits(courses, academicBase?.baseTotalCredits || 0);
	const completedCourses = getTotalCoursesCompleted(courses);
	const goalProgress = targetGpa ? Math.min((cgpa / targetGpa) * 100, 100) : 0;

	const handleSaveTotalDegreeCredits = async () => {
		if (!user) return;

		setDegreeCreditsError(null);
		setDegreeCreditsMessage(null);

		const parsed = Number(totalDegreeCreditsInput.trim());
		if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
			setDegreeCreditsError(
				"Expected Total Degree Credits must be a whole number greater than 0.",
			);
			return;
		}

		setIsSavingDegreeCredits(true);
		try {
			await setUserTotalDegreeCredits(user.id, parsed);
			setTotalDegreeCredits(parsed);
			setTotalDegreeCreditsInput(String(parsed));
			setDegreeCreditsMessage("Expected Total Degree Credits saved.");
		} catch (error) {
			setDegreeCreditsError(
				error instanceof Error
					? error.message
					: "Failed to save Expected Total Degree Credits.",
			);
		} finally {
			setIsSavingDegreeCredits(false);
		}
	};

	const handleSaveAcademicBase = async () => {
		if (!user) return;

		setBaseError(null);
		setBaseMessage(null);

		const cgpaRaw = baseCgpaInput.trim();
		const creditsRaw = baseCreditsInput.trim();

		if (!cgpaRaw && !creditsRaw) {
			setIsSavingBase(true);
			try {
				await setUserAcademicBase(user.id, null);
				setAcademicBase(null);
				setBaseMessage("Quick Start base values cleared.");
			} catch (error) {
				setBaseError(
					error instanceof Error
						? error.message
						: "Failed to clear base values.",
				);
			} finally {
				setIsSavingBase(false);
			}
			return;
		}

		const parsedCgpa = Number(cgpaRaw);
		const parsedCredits = Number(creditsRaw);

		if (!Number.isFinite(parsedCgpa) || parsedCgpa < 0 || parsedCgpa > maxScaleWeight) {
			setBaseError(
				`Base CGPA must be a number between 0.00 and ${maxScaleWeight.toFixed(2)}.`,
			);
			return;
		}

		if (
			!Number.isFinite(parsedCredits) ||
			parsedCredits < 0 ||
			!Number.isInteger(parsedCredits)
		) {
			setBaseError("Base Total Credits must be a whole number greater than or equal to 0.");
			return;
		}

		setIsSavingBase(true);
		try {
			const normalized: AcademicBaseValues = {
				baseCgpa: Number(parsedCgpa.toFixed(2)),
				baseTotalCredits: parsedCredits,
			};

			await setUserAcademicBase(user.id, normalized);
			setAcademicBase(normalized);
			setBaseCgpaInput(normalized.baseCgpa.toFixed(2));
			setBaseCreditsInput(String(normalized.baseTotalCredits));
			setBaseMessage("Quick Start base values saved.");
		} catch (error) {
			setBaseError(
				error instanceof Error ? error.message : "Failed to save base values.",
			);
		} finally {
			setIsSavingBase(false);
		}
	};

	const handleSaveTarget = async () => {
		if (!user) return;

		setGoalError(null);
		setGoalMessage(null);

		const trimmed = targetGpaInput.trim();
		if (!trimmed) {
			setIsSavingGoal(true);
			try {
				await setUserTargetGpa(user.id, null);
				setTargetGpa(null);
				setGoalMessage("Target GPA cleared.");
			} catch (error) {
				setGoalError(
					error instanceof Error ? error.message : "Failed to clear target GPA.",
				);
			} finally {
				setIsSavingGoal(false);
			}
			return;
		}

		const parsed = Number(trimmed);
		if (!Number.isFinite(parsed) || parsed < 0 || parsed > maxScaleWeight) {
			setGoalError(
				`Target GPA must be a number between 0.00 and ${maxScaleWeight.toFixed(2)}.`,
			);
			return;
		}

		setIsSavingGoal(true);
		try {
			const normalized = Number(parsed.toFixed(2));
			await setUserTargetGpa(user.id, normalized);
			setTargetGpa(normalized);
			setTargetGpaInput(normalized.toFixed(2));
			setGoalMessage("Target GPA saved.");
		} catch (error) {
			setGoalError(
				error instanceof Error ? error.message : "Failed to save target GPA.",
			);
		} finally {
			setIsSavingGoal(false);
		}
	};

	return (
		<div className="min-h-screen bg-base-200">
			<Navbar userName={user.name} />

			<div className="container mx-auto p-4 px-4 sm:px-6 lg:px-8 max-w-4xl">
				<OfflineBanner />

				<h1 className="text-3xl font-bold mb-6">Profile</h1>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-1">
						<div className="card bg-base-100 shadow-xl">
							<div className="card-body items-center text-center">
								<div className="avatar placeholder">
									<div className="bg-neutral text-neutral-content rounded-full w-24 flex justify-center items-center">
										<span className="text-4xl">
											{user.name.charAt(0).toUpperCase()}
										</span>
									</div>
								</div>
								<h2 className="card-title mt-4">{user.name}</h2>
								<p className="text-sm opacity-70">{user.email}</p>
								<div className="divider" />
								<div className="stats stats-vertical shadow w-full">
									<div className="stat">
										<div className="stat-title">CGPA</div>
										<div className="stat-value text-primary text-2xl sm:text-3xl">
											{cgpa.toFixed(2)}
										</div>
									</div>
									<div className="stat">
										<div className="stat-title">Credits</div>
										<div className="stat-value text-secondary text-2xl sm:text-3xl">
											{totalCredits}
										</div>
									</div>
									<div className="stat">
										<div className="stat-title">Courses</div>
										<div className="stat-value text-accent text-2xl sm:text-3xl">
											{completedCourses}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="lg:col-span-2 space-y-6">
						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Quick Start (Higher Level)</h2>
								<p className="text-sm opacity-70">
									Enter your existing CGPA and total completed credits so new semesters
									continue from your previous academic record.
								</p>

								{baseError && (
									<div role="alert" className="alert alert-error">
										<AlertCircle className="h-6 w-6 shrink-0" />
										<span>{baseError}</span>
									</div>
								)}

								{baseMessage && (
									<div role="status" className="alert alert-success">
										<span>{baseMessage}</span>
									</div>
								)}

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
									<div>
										<label htmlFor="base-cgpa-input" className="label">
											<span className="label-text font-medium">Base CGPA</span>
										</label>
										<input
											id="base-cgpa-input"
											type="number"
											className="input input-bordered w-full"
											min={0}
											max={maxScaleWeight}
											step={0.01}
											placeholder="e.g. 3.85"
											value={baseCgpaInput}
											onChange={(event) => setBaseCgpaInput(event.target.value)}
										/>
										<p className="text-xs opacity-70 mt-1">
											Scale maximum: {maxScaleWeight.toFixed(1)}
										</p>
									</div>

									<div>
										<label htmlFor="base-credits-input" className="label">
											<span className="label-text font-medium">Base Total Credits</span>
										</label>
										<input
											id="base-credits-input"
											type="number"
											className="input input-bordered w-full"
											min={0}
											step={1}
											placeholder="e.g. 84"
											value={baseCreditsInput}
											onChange={(event) => setBaseCreditsInput(event.target.value)}
										/>
									</div>

									<button
										type="button"
										className="btn btn-primary"
										onClick={() => void handleSaveAcademicBase()}
										disabled={isSavingBase}
									>
										{isSavingBase ? "Saving..." : "Save Base"}
									</button>
								</div>
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Academic Goal</h2>

								{goalError && (
									<div role="alert" className="alert alert-error">
										<AlertCircle className="h-6 w-6 shrink-0" />
										<span>{goalError}</span>
									</div>
								)}

								{goalMessage && (
									<div role="status" className="alert alert-success">
										<span>{goalMessage}</span>
									</div>
								)}

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
									<div className="sm:col-span-2">
										<label htmlFor="target-gpa-input" className="label">
											<span className="label-text font-medium">Target GPA</span>
										</label>
										<input
											id="target-gpa-input"
											type="number"
											className="input input-bordered w-full"
											min={0}
											max={maxScaleWeight}
											step={0.01}
											placeholder="e.g. 4.20"
											value={targetGpaInput}
											onChange={(event) => setTargetGpaInput(event.target.value)}
										/>
										<p className="text-xs opacity-70 mt-1">
											Scale maximum: {maxScaleWeight.toFixed(1)}
										</p>
									</div>
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => void handleSaveTarget()}
										disabled={isSavingGoal}
									>
										{isSavingGoal ? "Saving..." : "Save Target"}
									</button>
								</div>

								{targetGpa !== null ? (
									<div className="space-y-2">
										<p className="text-sm opacity-80">
											Current CGPA: <span className="font-semibold">{cgpa.toFixed(2)}</span>
											 / Target: <span className="font-semibold">{targetGpa.toFixed(2)}</span>
										</p>
										<progress
											className="progress progress-primary w-full"
											value={goalProgress}
											max={100}
										/>
										<p className="text-sm opacity-70">Goal progress: {goalProgress.toFixed(1)}%</p>
										{completedCourses > 0 && cgpa < targetGpa && (
											<div role="alert" className="alert alert-warning">
												<AlertCircle className="h-6 w-6 shrink-0" />
												<span>
													Current CGPA is below your target by {(targetGpa - cgpa).toFixed(2)}.
												</span>
											</div>
										)}
									</div>
								) : (
									<p className="text-sm opacity-70">
										Set a target GPA to track your progress and receive performance alerts.
									</p>
								)}
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Degree Requirement</h2>

								{degreeCreditsError && (
									<div role="alert" className="alert alert-error">
										<AlertCircle className="h-6 w-6 shrink-0" />
										<span>{degreeCreditsError}</span>
									</div>
								)}

								{degreeCreditsMessage && (
									<div role="status" className="alert alert-success">
										<span>{degreeCreditsMessage}</span>
									</div>
								)}

								<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
									<div className="sm:col-span-2">
										<label htmlFor="total-degree-credits-input" className="label">
											<span className="label-text font-medium">
												Expected Total Degree Credits
											</span>
										</label>
										<input
											id="total-degree-credits-input"
											type="number"
											className="input input-bordered w-full"
											min={1}
											step={1}
											placeholder="e.g. 150"
											value={totalDegreeCreditsInput}
											onChange={(event) => setTotalDegreeCreditsInput(event.target.value)}
										/>
										<p className="text-xs opacity-70 mt-1">
											Current setting: {totalDegreeCredits} credits
										</p>
									</div>
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => void handleSaveTotalDegreeCredits()}
										disabled={isSavingDegreeCredits}
									>
										{isSavingDegreeCredits ? "Saving..." : "Save Credits"}
									</button>
								</div>
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Account Information</h2>
								<div className="space-y-4">
									<div>
										<label htmlFor="name-display" className="label">
											<span className="label-text font-medium">Full Name</span>
										</label>
										<input
											id="name-display"
											type="text"
											className="input input-bordered w-full"
											value={user.name}
											disabled
										/>
									</div>
									<div>
										<label htmlFor="email-display" className="label">
											<span className="label-text font-medium">Email</span>
										</label>
										<input
											id="email-display"
											type="email"
											className="input input-bordered w-full"
											value={user.email}
											disabled
										/>
									</div>
									<div>
										<label htmlFor="member-since-display" className="label">
											<span className="label-text font-medium">
												Member Since
											</span>
										</label>
										<input
											id="member-since-display"
											type="text"
											className="input input-bordered w-full"
											value={new Date(user.createdAt).toLocaleDateString()}
											disabled
										/>
									</div>
								</div>
							</div>
						</div>

						<div>
							<GradingScaleConfig
								userId={user.id}
								initialScale={gradingScale}
								onSaved={(scale) => setGradingScale(scale)}
							/>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Academic Summary</h2>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="stat bg-base-200 rounded-lg">
										<div className="stat-title">Total Courses</div>
										<div className="stat-value text-primary">
											{courses.length}
										</div>
									</div>
									<div className="stat bg-base-200 rounded-lg">
										<div className="stat-title">Completed</div>
										<div className="stat-value text-success">
											{completedCourses}
										</div>
									</div>
									<div className="stat bg-base-200 rounded-lg">
										<div className="stat-title">In Progress</div>
										<div className="stat-value text-warning">
											{courses.filter((c) => c.status === "in-progress").length}
										</div>
									</div>
									<div className="stat bg-base-200 rounded-lg">
										<div className="stat-title">Credits Earned</div>
										<div className="stat-value text-accent">{totalCredits}</div>
									</div>
								</div>
							</div>
						</div>

						<div className="card bg-base-100 shadow-xl">
							<div className="card-body">
								<h2 className="card-title">Actions</h2>
								<div className="space-y-2">
									<button
										type="button"
										className="btn btn-outline btn-error w-full justify-start gap-2"
									>
										<Trash2 className="h-5 w-5" />
										Clear All Data
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
