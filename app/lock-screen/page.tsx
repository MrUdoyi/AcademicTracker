"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/hooks/use-auth";
import { getBiometricConfig, verifyPin, getSessionToken } from "../lib/storage/biometric";

export default function LockScreen() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [pin, setPin] = useState("");
	const [error, setError] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [sessionActive, setSessionActive] = useState(false);

	useEffect(() => {
		if (loading) return;

		if (!user) {
			router.push("/");
			return;
		}

		// Check if user has active session
		const sessionToken = getSessionToken(user.id);
		if (sessionToken) {
			setSessionActive(true);
			router.push("/dashboard");
			return;
		}

		// Check if user has biometric setup
		const config = getBiometricConfig(user.id);
		if (!config) {
			router.push("/biometric-setup");
		}
	}, [user, loading, router]);

	const handlePinSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || pin.length < 4) return;

		setIsVerifying(true);
		setError("");

		try {
			const isValid = verifyPin(user.id, pin);
			if (isValid) {
				setPin("");
				router.push("/dashboard");
			} else {
				setError("Invalid PIN");
				setPin("");
			}
		} catch (err) {
			setError("Verification failed");
			console.error(err);
		} finally {
			setIsVerifying(false);
		}
	};

	if (loading || !user || sessionActive) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<span className="loading loading-spinner loading-lg" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
			<div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
				<div className="text-center mb-8">
					<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span className="text-3xl">🎓</span>
					</div>
					<h1 className="text-2xl font-bold">AcademicTracker</h1>
					<p className="text-gray-600 text-sm mt-1">Enter your PIN to continue</p>
				</div>

				<form onSubmit={handlePinSubmit} className="space-y-4">
					<div>
						<input
							type="password"
							inputMode="numeric"
							placeholder="••••"
							value={pin}
							onChange={(e) => {
								setPin(e.target.value.replace(/\D/g, ""));
								setError("");
							}}
							className={`w-full p-4 text-center text-2xl tracking-widest border-2 rounded-lg focus:outline-none transition ${
								error ? "border-red-500 focus:ring-2 focus:ring-red-200" : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
							}`}
							maxLength={6}
							disabled={isVerifying}
							autoFocus
						/>
						{error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
					</div>

					<button
						type="submit"
						disabled={pin.length < 4 || isVerifying}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
					>
						{isVerifying ? "Verifying..." : "Unlock"}
					</button>
				</form>

				<p className="text-center text-gray-500 text-xs mt-6">
					Secured with PIN authentication
				</p>
			</div>
		</div>
	);
}
