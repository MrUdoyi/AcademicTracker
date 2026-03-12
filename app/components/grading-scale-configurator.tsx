"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
	normalizeGradingScale,
	type GradingScale,
} from "../lib/schemas/grading-scale";
import { setUserCgpaScale, setUserGradingScale } from "../lib/storage/user";
import {
	generateDefaultScale,
	type GradeTier,
	type MinAScore,
	type ScaleType,
} from "../../src/utils/gradingScaleGenerator";

type ConfigMode = "auto" | "custom";

function inferCgpaScale(
	scale?: GradingScale | null,
	fallback: ScaleType = 5,
): ScaleType {
	if (!scale || scale.length === 0) {
		return fallback;
	}

	const normalized = normalizeGradingScale(scale);
	const maxWeight = normalized[0]?.weight ?? fallback;
	return maxWeight <= 4 ? 4 : 5;
}

function inferMinAScore(scale?: GradingScale | null): MinAScore {
	if (!scale || scale.length === 0) {
		return 70;
	}

	const normalized = normalizeGradingScale(scale);
	const aBand = normalized.find((item) => item.grade.toUpperCase() === "A");
	if (!aBand) {
		return 70;
	}

	return aBand.minScore >= 80 ? 80 : 70;
}

function gradingScaleToTiers(scale?: GradingScale | null): GradeTier[] {
	if (!scale || scale.length === 0) {
		return [];
	}

	return normalizeGradingScale(scale).map((item) => ({
		grade: item.grade,
		points: item.weight,
		minScore: item.minScore,
	}));
}

function tiersToGradingScale(scaleArray: GradeTier[]): GradingScale {
	return scaleArray.map((item) => ({
		grade: item.grade.trim().toUpperCase(),
		weight: Number(item.points),
		minScore: Number(item.minScore),
	}));
}

function areTierArraysEqual(a: GradeTier[], b: GradeTier[]): boolean {
	if (a.length !== b.length) return false;

	for (let index = 0; index < a.length; index += 1) {
		if (
			a[index].grade !== b[index].grade ||
			a[index].points !== b[index].points ||
			a[index].minScore !== b[index].minScore
		) {
			return false;
		}
	}

	return true;
}

interface GradingScaleConfiguratorProps {
	userId: string;
	initialScale?: GradingScale | null;
	initialCgpaScale?: ScaleType;
	onSaved?: (payload: {
		gradingScale: GradingScale;
		cgpaScale: ScaleType;
	}) => void;
}

export function GradingScaleConfigurator({
	userId,
	initialScale,
	initialCgpaScale = 5,
	onSaved,
}: GradingScaleConfiguratorProps) {
	const inferredCgpaScale = useMemo(
		() => inferCgpaScale(initialScale, initialCgpaScale),
		[initialScale, initialCgpaScale],
	);
	const inferredMinA = useMemo(() => inferMinAScore(initialScale), [initialScale]);
	const initialGeneratedScale = useMemo(
		() => generateDefaultScale(inferredCgpaScale, inferredMinA),
		[inferredCgpaScale, inferredMinA],
	);
	const initialScaleArrayFromProfile = useMemo(() => {
		const mapped = gradingScaleToTiers(initialScale);
		if (mapped.length > 0) {
			return mapped;
		}

		return initialGeneratedScale;
	}, [initialScale, initialGeneratedScale]);

	const [selectedCgpaScale, setSelectedCgpaScale] = useState<ScaleType>(
		inferredCgpaScale,
	);
	const [selectedMinA, setSelectedMinA] = useState<MinAScore>(inferredMinA);
	const [currentScaleArray, setCurrentScaleArray] = useState<GradeTier[]>(
		initialScaleArrayFromProfile,
	);
	const [mode, setMode] = useState<ConfigMode>(
		areTierArraysEqual(initialScaleArrayFromProfile, initialGeneratedScale)
			? "auto"
			: "custom",
	);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const skipAutoGenerateRef = useRef(true);

	useEffect(() => {
		setSelectedCgpaScale(inferredCgpaScale);
		setSelectedMinA(inferredMinA);
		setCurrentScaleArray(initialScaleArrayFromProfile);
		setMode(
			areTierArraysEqual(initialScaleArrayFromProfile, initialGeneratedScale)
				? "auto"
				: "custom",
		);
		setMessage(null);
		setError(null);
		skipAutoGenerateRef.current = true;
	}, [inferredCgpaScale, inferredMinA, initialScaleArrayFromProfile, initialGeneratedScale]);

	useEffect(() => {
		if (skipAutoGenerateRef.current) {
			skipAutoGenerateRef.current = false;
			return;
		}

		setCurrentScaleArray(generateDefaultScale(selectedCgpaScale, selectedMinA));
		setMode("auto");
		setMessage(null);
		setError(null);
	}, [selectedCgpaScale, selectedMinA]);

	const handleRowEdit = (
		index: number,
		field: keyof GradeTier,
		nextValue: string,
	) => {
		setMessage(null);
		setError(null);
		setMode("custom");

		setCurrentScaleArray((prev) =>
			prev.map((item, rowIndex) => {
				if (rowIndex !== index) {
					return item;
				}

				if (field === "grade") {
					return {
						...item,
						grade: nextValue.toUpperCase(),
					};
				}

				const parsed = Number(nextValue);
				const numericValue = Number.isFinite(parsed) ? parsed : 0;

				if (field === "points") {
					return {
						...item,
						points: numericValue,
					};
				}

				return {
					...item,
					minScore: numericValue,
				};
			}),
		);
	};

	const handleSaveProfile = async () => {
		setMessage(null);
		setError(null);

		if (currentScaleArray.length === 0) {
			setError("Add at least one grading row before saving.");
			return;
		}

		for (const item of currentScaleArray) {
			if (!item.grade.trim()) {
				setError("Each row must have a grade value.");
				return;
			}

			if (!Number.isFinite(item.points) || item.points < 0 || item.points > selectedCgpaScale) {
				setError(
					`Each points value must be between 0 and ${selectedCgpaScale.toFixed(1)}.`,
				);
				return;
			}

			if (!Number.isFinite(item.minScore) || item.minScore < 0 || item.minScore > 100) {
				setError("Each minimum score must be between 0 and 100.");
				return;
			}
		}

		const profileScale = normalizeGradingScale(tiersToGradingScale(currentScaleArray));

		setSaving(true);
		try {
			await setUserCgpaScale(userId, selectedCgpaScale);
			await setUserGradingScale(userId, profileScale);

			setCurrentScaleArray(
				profileScale.map((item) => ({
					grade: item.grade,
					points: item.weight,
					minScore: item.minScore,
				})),
			);
			setMessage("Profile grading scale saved.");
			onSaved?.({ gradingScale: profileScale, cgpaScale: selectedCgpaScale });
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

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<label className="form-control w-full">
					<span className="label-text font-medium mb-1">CGPA Scale</span>
					<select
						className="select select-bordered w-full"
						value={selectedCgpaScale}
						onChange={(event) =>
							setSelectedCgpaScale(Number(event.target.value) as ScaleType)
						}
					>
						<option value={5}>5-Point</option>
						<option value={4}>4-Point</option>
					</select>
				</label>

				<label className="form-control w-full">
					<span className="label-text font-medium mb-1">Score for an &quot;A&quot;</span>
					<select
						className="select select-bordered w-full"
						value={selectedMinA}
						onChange={(event) =>
							setSelectedMinA(Number(event.target.value) as MinAScore)
						}
					>
						<option value={70}>70+</option>
						<option value={80}>80+</option>
					</select>
				</label>
			</div>

			<div className="flex items-center justify-between text-xs opacity-70">
				<span>
					Mode: {mode === "custom" ? "Custom" : "Auto-generated from quick settings"}
				</span>
				<span>{currentScaleArray.length} rows</span>
			</div>

			<div className="space-y-2">
				<div className="grid grid-cols-3 gap-2 text-xs font-semibold px-1 opacity-70">
					<span>Grade</span>
					<span>Points</span>
					<span>Min Score %</span>
				</div>

				{currentScaleArray.map((item, index) => (
					<div key={`${item.grade}-${index}`} className="grid grid-cols-3 gap-2">
						<input
							type="text"
							className="input input-bordered input-sm w-full"
							value={item.grade}
							onChange={(event) =>
								handleRowEdit(index, "grade", event.target.value)
							}
						/>
						<input
							type="number"
							className="input input-bordered input-sm w-full"
							min={0}
							max={selectedCgpaScale}
							step={0.5}
							value={item.points}
							onFocus={(e) => e.target.select()}
							onChange={(event) =>
								handleRowEdit(index, "points", event.target.value)
							}
						/>
						<input
							type="number"
							className="input input-bordered input-sm w-full"
							min={0}
							max={100}
							step={1}
							value={item.minScore}
							onFocus={(e) => e.target.select()}
							onChange={(event) =>
								handleRowEdit(index, "minScore", event.target.value)
							}
						/>
					</div>
				))}
			</div>

			{error && <p className="text-sm text-error">{error}</p>}
			{message && <p className="text-sm text-success">{message}</p>}

			<div className="flex justify-end">
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => void handleSaveProfile()}
					disabled={saving}
				>
					{saving ? "Saving..." : "Save Profile"}
				</button>
			</div>
		</div>
	);
}
