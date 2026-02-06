"use client";

import { AlertCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import * as v from "valibot";
import { Navbar } from "../components/navbar";
import { useAuth } from "../lib/hooks/use-auth";
import type { Course } from "../lib/schemas/course";
import { CreateCourseSchema } from "../lib/schemas/course";
import {
	createCourse,
	deleteCourse,
	getCoursesBySemester,
	updateCourse,
} from "../lib/storage/course";

export default function CoursesPage() {
	const router = useRouter();
	const { user, loading } = useAuth();
	const [coursesBySemester, setCoursesBySemester] = useState<
		Record<string, Course[]>
	>({});
	const [showModal, setShowModal] = useState(false);
	const [editingCourse, setEditingCourse] = useState<Course | null>(null);
	const [error, setError] = useState("");

	const [formData, setFormData] = useState({
		courseCode: "",
		title: "",
		units: 3,
		grade: "",
		semester: "First" as "First" | "Second" | "Summer",
		year: new Date().getFullYear(),
		status: "in-progress" as "in-progress" | "completed",
	});

	const loadCourses = useCallback(() => {
		if (!user) return;
		const grouped = getCoursesBySemester(user.id);
		setCoursesBySemester(grouped);
	}, [user]);

	useEffect(() => {
		if (!loading && !user) {
			router.push("/");
			return;
		}

		if (user) {
			loadCourses();
		}
	}, [user, loading, router, loadCourses]);

	const openAddModal = () => {
		setEditingCourse(null);
		setFormData({
			courseCode: "",
			title: "",
			units: 3,
			grade: "",
			semester: "First",
			year: new Date().getFullYear(),
			status: "in-progress",
		});
		setError("");
		setShowModal(true);
	};

	const openEditModal = (course: Course) => {
		setEditingCourse(course);
		setFormData({
			courseCode: course.courseCode,
			title: course.title,
			units: course.units,
			grade: course.grade || "",
			semester: course.semester,
			year: course.year,
			status: course.status,
		});
		setError("");
		setShowModal(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!user) return;

		try {
			const data = v.parse(CreateCourseSchema, {
				...formData,
				grade: formData.grade || undefined,
			});

			if (editingCourse) {
				updateCourse(editingCourse.id, data);
			} else {
				createCourse(user.id, data);
			}

			setShowModal(false);
			loadCourses();
		} catch (err) {
			if (err instanceof v.ValiError) {
				setError(err.issues[0].message);
			} else if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Failed to save course");
			}
		}
	};

	const handleDelete = (courseId: string) => {
		if (confirm("Are you sure you want to delete this course?")) {
			try {
				deleteCourse(courseId);
				loadCourses();
			} catch {
				alert("Failed to delete course");
			}
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<span className="loading loading-spinner loading-lg" />
			</div>
		);
	}

	if (!user) return null;

	return (
		<div className="min-h-screen bg-base-200">
			<Navbar userName={user.name} />

			<div className="container mx-auto p-4 px-4 sm:px-6 lg:px-8 max-w-7xl">
				<div className="flex justify-between items-center mb-6">
					<div>
						<h1 className="text-3xl font-bold">My Courses</h1>
						<p className="opacity-70 mt-1">Manage your academic courses</p>
					</div>
					<button
						type="button"
						onClick={openAddModal}
						className="btn btn-primary gap-2"
					>
						<Plus className="w-4 h-4" />
						Add Course
					</button>
				</div>

				{Object.keys(coursesBySemester).length === 0 ? (
					<div className="card bg-base-100 shadow-xl">
						<div className="card-body text-center py-12">
							<p className="text-lg opacity-70">No courses yet</p>
							<p className="text-sm opacity-50">
								Click &quot;Add Course&quot; to get started
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-6">
						{Object.entries(coursesBySemester).map(([semester, courses]) => (
							<div key={semester} className="card bg-base-100 shadow-xl">
								<div className="card-body">
									<h2 className="card-title text-xl sm:text-2xl mb-4">
										{semester}
									</h2>
									<div className="overflow-x-auto">
										<table className="table">
											<thead>
												<tr>
													<th>Code</th>
													<th>Title</th>
													<th>Units</th>
													<th>Grade</th>
													<th>Status</th>
													<th>Actions</th>
												</tr>
											</thead>
											<tbody>
												{courses.map((course) => (
													<tr key={course.id}>
														<td className="font-medium">{course.courseCode}</td>
														<td>{course.title}</td>
														<td>{course.units}</td>
														<td>
															{course.grade ? (
																<span className="badge badge-primary">
																	{course.grade}
																</span>
															) : (
																<span className="opacity-50">-</span>
															)}
														</td>
														<td>
															{course.status === "completed" ? (
																<span className="badge badge-success">
																	Completed
																</span>
															) : (
																<span className="badge badge-warning">
																	In Progress
																</span>
															)}
														</td>
														<td>
															<div className="flex gap-2">
																<button
																	type="button"
																	onClick={() => openEditModal(course)}
																	className="btn btn-sm btn-ghost"
																>
																	Edit
																</button>
																<button
																	type="button"
																	onClick={() => handleDelete(course.id)}
																	className="btn btn-sm btn-error btn-ghost"
																>
																	Delete
																</button>
															</div>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{showModal && (
				<dialog className="modal modal-open">
					<div className="modal-box max-w-2xl">
						<h3 className="font-bold text-lg mb-4">
							{editingCourse ? "Edit Course" : "Add New Course"}
						</h3>

						{error && (
							<div role="alert" className="alert alert-error mb-4">
								<AlertCircle className="h-6 w-6 shrink-0" />
								<span>{error}</span>
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label htmlFor="course-code-input" className="label">
									<span className="label-text">Course Code</span>
								</label>
								<input
									id="course-code-input"
									type="text"
									className="input input-bordered w-full"
									placeholder="e.g. CS101"
									value={formData.courseCode}
									onChange={(e) =>
										setFormData({ ...formData, courseCode: e.target.value })
									}
									required
								/>
							</div>

							<div>
								<label htmlFor="course-title-input" className="label">
									<span className="label-text">Course Title</span>
								</label>
								<input
									id="course-title-input"
									type="text"
									className="input input-bordered w-full"
									placeholder="e.g. Introduction to Computer Science"
									value={formData.title}
									onChange={(e) =>
										setFormData({ ...formData, title: e.target.value })
									}
									required
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label htmlFor="units-input" className="label">
										<span className="label-text">Units</span>
									</label>
									<input
										id="units-input"
										type="number"
										className="input input-bordered w-full"
										value={formData.units}
										onChange={(e) =>
											setFormData({
												...formData,
												units: Number(e.target.value),
											})
										}
										min={1}
										max={10}
										required
									/>
								</div>

								<div>
									<label htmlFor="grade-select" className="label">
										<span className="label-text">Grade</span>
									</label>
									<select
										id="grade-select"
										className="select select-bordered w-full"
										value={formData.grade}
										onChange={(e) =>
											setFormData({ ...formData, grade: e.target.value })
										}
									>
										<option value="">No Grade</option>
										<option value="A">A</option>
										<option value="B+">B+</option>
										<option value="B">B</option>
										<option value="C+">C+</option>
										<option value="C">C</option>
										<option value="D+">D+</option>
										<option value="D">D</option>
										<option value="E">E</option>
										<option value="F">F</option>
									</select>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label htmlFor="semester-select" className="label">
										<span className="label-text">Semester</span>
									</label>
									<select
										id="semester-select"
										className="select select-bordered w-full"
										value={formData.semester}
										onChange={(e) =>
											setFormData({
												...formData,
												semester: e.target.value as
													| "First"
													| "Second"
													| "Summer",
											})
										}
										required
									>
										<option value="First">First</option>
										<option value="Second">Second</option>
										<option value="Summer">Summer</option>
									</select>
								</div>

								<div>
									<label htmlFor="year-input" className="label">
										<span className="label-text">Year</span>
									</label>
									<input
										id="year-input"
										type="number"
										className="input input-bordered w-full"
										value={formData.year}
										onChange={(e) =>
											setFormData({
												...formData,
												year: Number(e.target.value),
											})
										}
										min={2000}
										max={2100}
										required
									/>
								</div>
							</div>

							<div>
								<label htmlFor="status-select" className="label">
									<span className="label-text">Status</span>
								</label>
								<select
									id="status-select"
									className="select select-bordered w-full"
									value={formData.status}
									onChange={(e) =>
										setFormData({
											...formData,
											status: e.target.value as "in-progress" | "completed",
										})
									}
									required
								>
									<option value="in-progress">In Progress</option>
									<option value="completed">Completed</option>
								</select>
							</div>

							<div className="modal-action">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="btn"
								>
									Cancel
								</button>
								<button type="submit" className="btn btn-primary">
									{editingCourse ? "Update" : "Add"} Course
								</button>
							</div>
						</form>
					</div>
					<form method="dialog" className="modal-backdrop">
						<button type="button" onClick={() => setShowModal(false)}>
							close
						</button>
					</form>
				</dialog>
			)}
		</div>
	);
}
