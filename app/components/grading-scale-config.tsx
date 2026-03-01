"use client";

import { useMemo, useState } from "react";
import {
	normalizeGradingScale,
	type GradingScale,
	type GradingScaleItem,
} from "../lib/schemas/grading-scale";
import { setUserGradingScale } from "../lib/storage/user";

const STANDARD_5_SCALE: GradingScale = [
	{ grade: "A", minScore: 70, weight: 5 },
	{ grade: "B+", minScore: 65, weight: 4.5 },
	{ grade: "B", minScore: 60, weight: 4 },
	{ grade: "C+", minScore: 55, weight: 3.5 },
	{ grade: "C", minScore: 50, weight: 3 },
	{ grade: "D+", minScore: 45, weight: 2.5 },
	{ grade: "D", minScore: 40, weight: 2 },
	{ grade: "E", minScore: 35, weight: 1 },
	{ grade: "F", minScore: 0, weight: 0 },
];

const STANDARD_4_SCALE: GradingScale = [
	{ grade: "A", minScore: 80, weight: 4 },
	{ grade: "B+", minScore: 75, weight: 3.5 },
	{ grade: "B", minScore: 70, weight: 3 },
	{ grade: "C+", minScore: 65, weight: 2.5 },
	{ grade: "C", minScore: 60, weight: 2 },
	{ grade: "D+", minScore: 55, weight: 1.5 },
	{ grade: "D", minScore: 50, weight: 1 },
	{ grade: "E", minScore: 45, weight: 0.5 },
	{ grade: "F", minScore: 0, weight: 0 },
];

type PresetKey = "standard-5" | "standard-4" | "custom";

function areScalesEquivalent(a: GradingScale, b: GradingScale): boolean {
	const first = normalizeGradingScale(a);
	const second = normalizeGradingScale(b);

	if (first.length !== second.length) return false;

	for (let index = 0; index < first.length; index += 1) {
		if (
			first[index].grade !== second[index].grade ||
			first[index].minScore !== second[index].minScore ||
			first[index].weight !== second[index].weight
		) {
			return false;
		}
	}

	return true;
}

function inferPreset(scale: GradingScale): PresetKey {
	if (areScalesEquivalent(scale, STANDARD_5_SCALE)) return "standard-5";
	if (areScalesEquivalent(scale, STANDARD_4_SCALE)) return "standard-4";
	return "custom";
}

interface GradingScaleConfigProps {
	userId: string;
	initialScale?: GradingScale | null;
	onSaved?: (scale: GradingScale) => void;
}

export function GradingScaleConfig({
	userId,
	initialScale,
	onSaved,
}: GradingScaleConfigProps) {
	const normalizedInitial = useMemo(
		() => normalizeGradingScale(initialScale),
		[initialScale],
	);

	const [preset, setPreset] = useState<PresetKey>(() =>
		inferPreset(normalizedInitial),
	);
	const [draftScale, setDraftScale] = useState<GradingScale>(normalizedInitial);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handlePresetChange = (value: PresetKey) => {
		setPreset(value);
		setMessage(null);
		setError(null);

		if (value === "standard-5") {
			setDraftScale(normalizeGradingScale(STANDARD_5_SCALE));
			return;
		}

		if (value === "standard-4") {
			setDraftScale(normalizeGradingScale(STANDARD_4_SCALE));
		}
	};

	const handleScoreChange = (grade: string, nextValue: string) => {
		setMessage(null);
		setError(null);
		setPreset("custom");

		const parsed = Number(nextValue);
		const score = Number.isFinite(parsed) ? parsed : 0;

		setDraftScale((prev) =>
			prev.map((item) =>
				item.grade === grade ? { ...item, minScore: score } : item,
			),
		);
	};

	const handleSave = async () => {
		setError(null);
		setMessage(null);

		for (const item of draftScale) {
			if (!Number.isFinite(item.minScore) || item.minScore < 0 || item.minScore > 100) {
				setError("All minimum scores must be numbers between 0 and 100.");
				return;
			}
		}

		setSaving(true);
		try {
			const normalized = normalizeGradingScale(draftScale);
			await setUserGradingScale(userId, normalized);
			setDraftScale(normalized);
			setPreset(inferPreset(normalized));
			setMessage("Grading scale saved.");
			onSaved?.(normalized);
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Failed to save grading scale.",
			);
		} finally {
			setSaving(false);
		}
	};

	const previewMaxWeight = normalizeGradingScale(draftScale)[0]?.weight ?? 5;

	return (
		<div className="card bg-base-100 shadow-xl">
			<div className="card-body gap-4">
				<h2 className="card-title">Grading Scale</h2>
				<p className="text-sm opacity-70">
					Choose a preset or customize minimum score thresholds for your school.
				</p>

				<label className="form-control w-full">
					<span className="label-text font-medium mb-1">Preset</span>
					<select
						className="select select-bordered w-full"
						value={preset}
						onChange={(event) =>
							handlePresetChange(event.target.value as PresetKey)
						}
					>
						<option value="standard-5">Standard 5.0 Scale (A = 70)</option>
						<option value="standard-4">Standard 4.0 Scale (A = 80)</option>
						<option value="custom">Custom</option>
					</select>
				</label>

				<div className="overflow-x-auto">
					<table className="table table-sm">
						<thead>
							<tr>
								<th>Grade</th>
								<th>Min Score</th>
								<th>Weight</th>
							</tr>
						</thead>
						<tbody>
							{draftScale.map((item: GradingScaleItem) => (
								<tr key={item.grade}>
									<td className="font-medium">{item.grade}</td>
									<td>
										<input
											type="number"
											className="input input-bordered input-sm w-24"
											min={0}
											max={100}
											step={1}
											value={item.minScore}
											onChange={(event) =>
												handleScoreChange(item.grade, event.target.value)
											}
										/>
									</td>
									<td>{item.weight.toFixed(1)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<p className="text-sm opacity-70">
					Current scale maximum GPA: {previewMaxWeight.toFixed(1)}
				</p>

				{error && <p className="text-sm text-error">{error}</p>}
				{message && <p className="text-sm text-success">{message}</p>}

				<div className="card-actions justify-end">
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => void handleSave()}
						disabled={saving}
					>
						{saving ? "Saving..." : "Save Grading Scale"}
					</button>
				</div>
			</div>
		</div>
	);
}
