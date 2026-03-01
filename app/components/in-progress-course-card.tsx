"use client";

import { useEffect, useMemo, useState } from "react";
import type { Grade } from "../lib/schemas/course";
import type { GradingScale } from "../lib/schemas/grading-scale";
import { normalizeGradingScale } from "../lib/schemas/grading-scale";
import { calculateRequiredExamScore } from "../lib/utils/grade-prediction";

interface InProgressCourseCardProps {
	courseId: string;
	courseCode: string;
	targetGrade?: Grade;
	currentScore?: number;
	maxAssessmentScore?: 30 | 40;
	gradingScale?: GradingScale | null;
	onSave: (payload: {
		courseId: string;
		targetGrade?: Grade;
		currentScore: number;
		maxAssessmentScore: 30 | 40;
	}) => Promise<void>;
}

export function InProgressCourseCard({
	courseId,
	courseCode,
	targetGrade,
	currentScore,
	maxAssessmentScore = 30,
	gradingScale,
	onSave,
}: InProgressCourseCardProps) {
	const normalizedScale = useMemo(
		() => normalizeGradingScale(gradingScale),
		[gradingScale],
	);

	const [selectedTargetGrade, setSelectedTargetGrade] = useState<string>(
		targetGrade || "",
	);
	const [scoreInput, setScoreInput] = useState<number>(currentScore ?? 0);
	const [assessmentWeight, setAssessmentWeight] = useState<30 | 40>(
		maxAssessmentScore,
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setSelectedTargetGrade(targetGrade || "");
		setScoreInput(currentScore ?? 0);
		setAssessmentWeight(maxAssessmentScore);
	}, [targetGrade, currentScore, maxAssessmentScore]);

	const targetThreshold = selectedTargetGrade
		? normalizedScale.find((item) => item.grade === selectedTargetGrade)?.minScore
		: undefined;
	const maxExamScore = 100 - assessmentWeight;

	const prediction = useMemo(() => {
		if (!selectedTargetGrade || targetThreshold === undefined) return null;
		return calculateRequiredExamScore({
			targetGrade: selectedTargetGrade,
			currentScore: scoreInput,
			maxExamScore,
			gradingScale: normalizedScale,
		});
	}, [selectedTargetGrade, targetThreshold, scoreInput, maxExamScore, normalizedScale]);

	const progressPercent = targetThreshold
		? Math.min((scoreInput / targetThreshold) * 100, 100)
		: 0;

	const handleSave = async () => {
		setError(null);

		if (scoreInput < 0) {
			setError("Current score cannot be negative.");
			return;
		}

		if (scoreInput > assessmentWeight) {
			setError("Current score cannot exceed max assessment score.");
			return;
		}

		setSaving(true);
		try {
			await onSave({
				courseId,
				targetGrade: selectedTargetGrade
					? (selectedTargetGrade as Grade)
					: undefined,
				currentScore: scoreInput,
				maxAssessmentScore: assessmentWeight,
			});
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Failed to save in-progress data.",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body gap-3">
				<h3 className="card-title text-base">{courseCode}</h3>

				<label className="form-control w-full">
					<span className="label-text mb-1">Target Grade</span>
					<select
						className="select select-bordered w-full"
						value={selectedTargetGrade}
						onChange={(event) => setSelectedTargetGrade(event.target.value)}
					>
						<option value="">No target</option>
						{normalizedScale.map((item) => (
							<option key={item.grade} value={item.grade}>
								{item.grade}
							</option>
						))}
					</select>
				</label>

				<label className="form-control w-full">
					<span className="label-text mb-1">Current Total Assessment Score</span>
					<input
						type="number"
						className="input input-bordered w-full"
						value={scoreInput}
						onChange={(event) => setScoreInput(Number(event.target.value))}
						min={0}
						max={assessmentWeight}
					/>
				</label>

				<label className="form-control w-full">
					<span className="label-text mb-1">Max Assessment Score</span>
					<select
						className="select select-bordered w-full"
						value={assessmentWeight}
						onChange={(event) =>
							setAssessmentWeight(Number(event.target.value) as 30 | 40)
						}
					>
						<option value={30}>30</option>
						<option value={40}>40</option>
					</select>
				</label>

				{targetThreshold !== undefined && (
					<div className="space-y-1">
						<p className="text-xs opacity-80">
							Progress toward target threshold ({targetThreshold})
						</p>
						<progress
							className="progress progress-primary w-full"
							value={progressPercent}
							max={100}
						/>
					</div>
				)}

				{prediction?.success && selectedTargetGrade ? (
					prediction.isTargetAchievable ? (
						<p className="text-sm">
							To get a {selectedTargetGrade}, you need a {prediction.requiredExamScore?.toFixed(2)}/{maxExamScore} on your final exam.
						</p>
					) : (
						<p className="text-sm text-warning">
							Your {selectedTargetGrade} target is ambitious. You need {prediction.requiredExamScore?.toFixed(2)}/{maxExamScore} on the final.
							{prediction.suggestion
								? ` A strong alternative is ${prediction.suggestion.grade} with ${prediction.suggestion.requiredExamScore.toFixed(2)}/${maxExamScore}.`
								: " Keep improving your assessment score to increase your options."}
						</p>
					)
				) : (
					<p className="text-sm opacity-70">
						Set a target grade to see your required final exam score.
					</p>
				)}

				{error && <p className="text-sm text-error">{error}</p>}

				<div className="card-actions justify-end">
					<button
						type="button"
						className="btn btn-primary btn-sm"
						disabled={saving}
						onClick={() => void handleSave()}
					>
						{saving ? "Saving..." : "Save"}
					</button>
				</div>
			</div>
		</div>
	);
}
