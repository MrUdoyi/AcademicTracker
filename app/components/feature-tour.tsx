"use client";

import { useEffect, useState } from "react";
import Joyride, { STATUS, type CallBackProps, type Step } from "react-joyride";
import {
	getUserHasSeenOnboarding,
	setUserHasSeenOnboarding,
} from "../lib/storage/user";

interface FeatureTourProps {
	userId: string;
	restartToken?: number;
}

const TOUR_STEPS: Step[] = [
	{
		target: "#quick-start-card",
		content: "Enter your current CGPA here to skip adding old courses.",
		disableBeacon: true,
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

	useEffect(() => {
		let mounted = true;

		const loadOnboardingFlag = async () => {
			const hasSeenOnboarding = await getUserHasSeenOnboarding(userId);
			if (!mounted) return;
			setRunTour(!hasSeenOnboarding);
		};

		void loadOnboardingFlag();

		return () => {
			mounted = false;
		};
	}, [userId]);

	useEffect(() => {
		if (restartToken <= 0) return;

		setRunTour(false);
		const timer = window.setTimeout(() => {
			setRunTour(true);
		}, 0);

		return () => window.clearTimeout(timer);
	}, [restartToken]);

	const handleTourCallback = (data: CallBackProps) => {
		const { status } = data;

		if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
			setRunTour(false);
			void setUserHasSeenOnboarding(userId, true);
		}
	};

	return (
		<Joyride
			steps={TOUR_STEPS}
			run={runTour}
			continuous
			showSkipButton
			scrollToFirstStep
			callback={handleTourCallback}
			styles={{
				options: {
					zIndex: 1100,
				},
			}}
		/>
	);
}
