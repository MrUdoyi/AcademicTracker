"use client";

import { useEffect, useMemo, useState } from "react";
import {
	getUserHasSeenOnboarding,
	setUserHasSeenOnboarding,
} from "../lib/storage/user";

interface FeatureTourProps {
	userId: string;
	restartToken?: number;
}

interface TourStep {
	target: string;
	content: string;
}

const TOUR_STEPS: TourStep[] = [
	{
		target: "#quick-start-card",
		content: "Enter your current CGPA here to skip adding old courses.",
	},
	{
		target: "#target-simulator-section",
		content:
			"Set your dream CGPA here, and we'll calculate exactly what you need on your next exam.",
	},
	{
		target: "#smart-advisor-card",
		content:
			"Check here for personalized alerts telling you which course needs the most attention.",
	},
];

export function FeatureTour({ userId, restartToken = 0 }: FeatureTourProps) {
	const [runTour, setRunTour] = useState(false);
	const [activeStepIndex, setActiveStepIndex] = useState(0);

	useEffect(() => {
		let mounted = true;

		const loadOnboardingFlag = async () => {
			const hasSeenOnboarding = await getUserHasSeenOnboarding(userId);
			if (!mounted) return;
			if (!hasSeenOnboarding) {
				setActiveStepIndex(0);
				setRunTour(true);
			}
		};

		void loadOnboardingFlag();

		return () => {
			mounted = false;
		};
	}, [userId]);

	useEffect(() => {
		if (restartToken <= 0) return;

		setActiveStepIndex(0);
		setRunTour(true);
	}, [restartToken]);

	const activeStep = TOUR_STEPS[activeStepIndex];

	const targetRect = useMemo(() => {
		if (!runTour || !activeStep) return null;
		const element = document.querySelector(activeStep.target);
		if (!element) return null;
		return element.getBoundingClientRect();
	}, [runTour, activeStep]);

	useEffect(() => {
		if (!runTour || !activeStep) return;
		const element = document.querySelector(activeStep.target);
		if (!element) {
			if (activeStepIndex < TOUR_STEPS.length - 1) {
				setActiveStepIndex((prev) => prev + 1);
			} else {
				setRunTour(false);
				void setUserHasSeenOnboarding(userId, true);
			}
			return;
		}

		element.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [runTour, activeStep, activeStepIndex, userId]);

	const finishTour = () => {
		setRunTour(false);
		void setUserHasSeenOnboarding(userId, true);
	};

	const handleNext = () => {
		if (activeStepIndex >= TOUR_STEPS.length - 1) {
			finishTour();
			return;
		}

		setActiveStepIndex((prev) => prev + 1);
	};

	useEffect(() => {
		if (!runTour) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				finishTour();
			}
		};

		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [runTour, userId]);

	if (!runTour || !activeStep || !targetRect) {
		return null;
	}

	const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
	const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 390;
	const bubbleTop = Math.min(targetRect.bottom + 12, viewportHeight - 180);
	const bubbleLeft = Math.max(16, Math.min(targetRect.left, viewportWidth - 340));

	return (
		<>
			<div className="fixed inset-0 bg-black/50 z-[1100]" />
			<div
				className="fixed border-2 border-primary rounded-lg pointer-events-none z-[1101]"
				style={{
					top: targetRect.top - 6,
					left: targetRect.left - 6,
					width: targetRect.width + 12,
					height: targetRect.height + 12,
				}}
			/>
			<div
				className="fixed bg-base-100 text-base-content rounded-xl shadow-xl p-4 w-[320px] max-w-[calc(100vw-2rem)] z-[1102]"
				style={{ top: bubbleTop, left: bubbleLeft }}
			>
				<p className="text-sm leading-6">{activeStep.content}</p>
				<div className="mt-3 flex items-center justify-between">
					<span className="text-xs opacity-70">
						Step {activeStepIndex + 1} of {TOUR_STEPS.length}
					</span>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={finishTour}
							className="btn btn-ghost btn-xs"
						>
							Skip
						</button>
						<button
							type="button"
							onClick={handleNext}
							className="btn btn-primary btn-xs"
						>
							{activeStepIndex === TOUR_STEPS.length - 1 ? "Done" : "Next"}
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
