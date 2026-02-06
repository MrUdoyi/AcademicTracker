"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "../components/navbar";
import { useAuth } from "../lib/hooks/use-auth";
import { getUserCourses } from "../lib/storage/course";
import {
	calculateCGPA,
	getTotalCoursesCompleted,
	getTotalCredits,
} from "../lib/utils/gpa";

export default function ProfilePage() {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) {
			router.push("/");
		}
	}, [user, loading, router]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<span className="loading loading-spinner loading-lg" />
			</div>
		);
	}

	if (!user) return null;

	const courses = getUserCourses(user.id);
	const cgpa = calculateCGPA(courses);
	const totalCredits = getTotalCredits(courses);
	const completedCourses = getTotalCoursesCompleted(courses);

	return (
		<div className="min-h-screen bg-base-200">
			<Navbar userName={user.name} />

			<div className="container mx-auto p-4 px-4 sm:px-6 lg:px-8 max-w-4xl">
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
