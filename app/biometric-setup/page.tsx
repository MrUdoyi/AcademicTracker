"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/hooks/use-auth";
import { setupBiometricAuth, isBiometricAvailable } from "../lib/storage/biometric";

export default function BiometricSetupPage() {
	const router = useRouter();
	const { user } = useAuth();
	const [step, setStep] = useState<"method" | "pin" | "confirm">("method");
	const [selectedMethod, setSelectedMethod] = useState<"faceId" | "fingerprint" | "pin">("pin");
	const [pin, setPin] = useState("");
	const [pinConfirm, setPinConfirm] = useState("");
	const [error, setError] = useState("");
	const [bioAvailable, setBioAvailable] = useState(false);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!user) {
			router.push("/");
			return;
		}

		const checkBio = async () => {
			const available = await isBiometricAvailable();
			setBioAvailable(available);
		};

		void checkBio();
	}, [user, router]);

	const handleMethodSelect = (method: "faceId" | "fingerprint" | "pin") => {
		setSelectedMethod(method);
		if (method === "pin") {
			setStep("pin");
		} else {
			// For demo: treat biometric as PIN setup too (in production, would use WebAuthn)
			setStep("pin");
		}
		setError("");
	};

	const handlePinSubmit = () => {
		if (pin.length < 4) {
			setError("PIN must be at least 4 digits");
			return;
		}
		if (!/^\d+$/.test(pin)) {
			setError("PIN must contain only numbers");
			return;
		}
		setStep("confirm");
		setError("");
	};

	const handleConfirmPin = async () => {
		if (pin !== pinConfirm) {
			setError("PINs do not match");
			return;
		}

		if (!user) return;

		setLoading(true);
		try {
			setupBiometricAuth(user.id, pin, selectedMethod);
			router.push("/dashboard");
		} catch (err) {
			setError("Failed to set up biometric auth");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	const handleSkip = () => {
		if (!user) return;
		// Set PIN to default (for demo purposes)
		setupBiometricAuth(user.id, "0000", "pin");
		router.push("/dashboard");
	};

	if (!user) return null;

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
				<h1 className="text-3xl font-bold text-center mb-2">Secure Your App</h1>
				<p className="text-center text-gray-600 mb-8">Choose how you&rsquo;d like to unlock AcademicTracker</p>

				{step === "method" && (
					<div className="space-y-4">
						{bioAvailable && (
							<>
								<button
									onClick={() => handleMethodSelect("faceId")}
									className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-3"
								>
									<span className="text-2xl">📱</span>
									<div className="text-left">
										<div className="font-semibold">Face ID</div>
										<div className="text-sm text-gray-500">Use your face to unlock</div>
									</div>
								</button>

								<button
									onClick={() => handleMethodSelect("fingerprint")}
									className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-3"
								>
									<span className="text-2xl">👆</span>
									<div className="text-left">
										<div className="font-semibold">Fingerprint</div>
										<div className="text-sm text-gray-500">Use your fingerprint to unlock</div>
									</div>
								</button>
							</>
						)}

						<button
							onClick={() => handleMethodSelect("pin")}
							className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition flex items-center gap-3"
						>
							<span className="text-2xl">🔐</span>
							<div className="text-left">
								<div className="font-semibold">PIN</div>
								<div className="text-sm text-gray-500">Use a numeric PIN to unlock</div>
							</div>
						</button>

						<button
							onClick={handleSkip}
							className="w-full mt-6 p-2 text-gray-600 hover:text-gray-800 text-center text-sm"
						>
							Skip for now
						</button>
					</div>
				)}

				{step === "pin" && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-semibold mb-2">Enter PIN (4+ digits)</label>
							<input
								type="password"
								inputMode="numeric"
								placeholder="0000"
								value={pin}
								onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
								className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								maxLength={6}
							/>
							{error && <p className="text-red-500 text-sm mt-1">{error}</p>}
						</div>
						<button
							onClick={handlePinSubmit}
							disabled={pin.length < 4}
							className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
						>
							Continue
						</button>
					</div>
				)}

				{step === "confirm" && (
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-semibold mb-2">Confirm PIN</label>
							<input
								type="password"
								inputMode="numeric"
								placeholder="0000"
								value={pinConfirm}
								onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ""))}
								className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								maxLength={6}
							/>
							{error && <p className="text-red-500 text-sm mt-1">{error}</p>}
						</div>
						<button
							onClick={handleConfirmPin}
							disabled={pinConfirm.length < 4 || loading}
							className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
						>
							{loading ? "Setting up..." : "Complete Setup"}
						</button>
						<button
							onClick={() => setStep("pin")}
							className="w-full p-2 text-gray-600 hover:text-gray-800 text-center text-sm"
						>
							Back
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
