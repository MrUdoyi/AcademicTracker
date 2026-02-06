"use client";

import {
	AlertCircle,
	GraduationCap,
	Lock,
	Mail,
	User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as v from "valibot";
import { RegisterSchema } from "../lib/schemas/user";
import { createUser, setCurrentUser } from "../lib/storage/user";

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<{
		name?: string;
		email?: string;
		password?: string;
		confirmPassword?: string;
	}>({});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setFieldErrors({});
		setLoading(true);

		try {
			if (password !== confirmPassword) {
				throw new Error("Passwords do not match");
			}

			const data = v.parse(RegisterSchema, {
				name,
				email,
				password,
				confirmPassword,
			});

			const user = createUser(data);
			setCurrentUser(user);
			router.push("/dashboard");
		} catch (err) {
			if (err instanceof v.ValiError) {
				const newFieldErrors: {
					name?: string;
					email?: string;
					password?: string;
					confirmPassword?: string;
				} = {};
				for (const issue of err.issues) {
					const pathKey = issue.path?.[0]?.key;
					const path = typeof pathKey === "string" ? pathKey : "";
					if (
						path === "name" ||
						path === "email" ||
						path === "password" ||
						path === "confirmPassword"
					) {
						newFieldErrors[path as keyof typeof newFieldErrors] = issue.message;
					}
				}
				if (Object.keys(newFieldErrors).length > 0) {
					setFieldErrors(newFieldErrors);
				} else {
					setError(err.issues[0].message);
				}
			} else if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Registration failed. Please try again.");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-base-200 p-4 sm:p-6 lg:p-8">
			<div className="card w-full max-w-md bg-base-100 shadow-xl">
				<div className="card-body p-6 sm:p-8">
					<div className="text-center mb-6">
						<div className="flex justify-center mb-3">
							<GraduationCap className="w-16 h-16 text-primary" />
						</div>
						<h1 className="text-2xl sm:text-3xl font-bold">Create Account</h1>
						<p className="text-sm sm:text-base opacity-70 mt-2">
							Start tracking your academic progress
						</p>
					</div>

					{error && (
						<div role="alert" className="alert alert-error">
							<AlertCircle className="h-6 w-6 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						<label className="w-full">
							<span className="label font-medium">Full Name</span>
							<label
								className={`input input-bordered flex items-center gap-2 mt-1 w-full ${
									fieldErrors.name ? "input-error" : ""
								}`}
							>
								<UserIcon className="w-4 h-4 opacity-70" />
								<input
									id="name-input"
									type="text"
									className="grow"
									placeholder="John Doe"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									autoComplete="name"
									aria-invalid={fieldErrors.name ? "true" : "false"}
									aria-describedby={fieldErrors.name ? "name-error" : undefined}
								/>
							</label>
							{fieldErrors.name && (
								<span className="label text-error mt-1" id="name-error">
									{fieldErrors.name}
								</span>
							)}
						</label>

						<label className="w-full">
							<span className="label font-medium">Email Address</span>
							<label
								className={`input input-bordered flex items-center gap-2 mt-1 w-full ${
									fieldErrors.email ? "input-error" : ""
								}`}
							>
								<Mail className="w-4 h-4 opacity-70" />
								<input
									id="email-input"
									type="email"
									className="grow"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									autoComplete="email"
									aria-invalid={fieldErrors.email ? "true" : "false"}
									aria-describedby={
										fieldErrors.email ? "email-error" : undefined
									}
								/>
							</label>
							{fieldErrors.email && (
								<span className="label text-error mt-1" id="email-error">
									{fieldErrors.email}
								</span>
							)}
						</label>

						<label className="w-full">
							<span className="label font-medium">Password</span>
							<label
								className={`input input-bordered flex items-center gap-2 mt-1 w-full ${
									fieldErrors.password ? "input-error" : ""
								}`}
							>
								<Lock className="w-4 h-4 opacity-70" />
								<input
									id="password-input"
									type="password"
									className="grow"
									placeholder="Create a password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									autoComplete="new-password"
									aria-invalid={fieldErrors.password ? "true" : "false"}
									aria-describedby={
										fieldErrors.password ? "password-error" : undefined
									}
								/>
							</label>
							{fieldErrors.password && (
								<span className="label text-error mt-1" id="password-error">
									{fieldErrors.password}
								</span>
							)}
						</label>

						<label className="w-full">
							<span className="label font-medium">Confirm Password</span>
							<label
								className={`input input-bordered flex items-center gap-2 mt-1 w-full ${
									fieldErrors.confirmPassword ? "input-error" : ""
								}`}
							>
								<Lock className="w-4 h-4 opacity-70" />
								<input
									id="confirm-password-input"
									type="password"
									className="grow"
									placeholder="Confirm your password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									autoComplete="new-password"
									aria-invalid={fieldErrors.confirmPassword ? "true" : "false"}
									aria-describedby={
										fieldErrors.confirmPassword
											? "confirm-password-error"
											: undefined
									}
								/>
							</label>
							{fieldErrors.confirmPassword && (
								<span
									className="label text-error mt-1"
									id="confirm-password-error"
								>
									{fieldErrors.confirmPassword}
								</span>
							)}
						</label>

						<button
							type="submit"
							className="btn btn-primary w-full"
							disabled={
								loading || !name || !email || !password || !confirmPassword
							}
							aria-label={loading ? "Creating account..." : "Sign Up"}
						>
							{loading ? (
								<>
									<span className="loading loading-spinner loading-sm" />
									<span>Creating account...</span>
								</>
							) : (
								"Sign Up"
							)}
						</button>

						<p className="text-center text-sm sm:text-base opacity-70">
							Already have an account?{" "}
							<Link href="/" className="link link-primary">
								Login
							</Link>
						</p>
					</form>
				</div>
			</div>
		</div>
	);
}
