"use client";

import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/hooks/use-auth";
import type { Course } from "../lib/schemas/course";
import { getUserCourses } from "../lib/storage/course";
import {
	getReadNotificationIds,
	saveReadNotificationIds,
} from "../lib/storage/notifications";
import { getUserAcademicBase, getUserTargetGpa } from "../lib/storage/user";
import { calculateCGPA, getCoursesInProgress, gradeToPoints } from "../lib/utils/gpa";

type ReminderType = "info" | "warning";

interface Reminder {
	id: string;
	type: ReminderType;
	title: string;
	message: string;
}

function buildReminders(
	courses: Course[],
	targetGpa: number | null,
	base: { baseCgpa: number; baseTotalCredits: number } | null,
): Reminder[] {
	const reminders: Reminder[] = [];
	const completed = courses.filter((course) => course.status === "completed");
	const inProgress = getCoursesInProgress(courses);
	const cgpa = calculateCGPA(courses, base);

	if (courses.length === 0) {
		reminders.push({
			id: "add-first-course",
			type: "info",
			title: "Get started",
			message: "Add your first course to start receiving trend analytics and recommendations.",
		});
	}

	if (inProgress > 0) {
		reminders.push({
			id: "update-in-progress",
			type: "info",
			title: "Reminder",
			message: `You have ${inProgress} in-progress course${inProgress > 1 ? "s" : ""}. Update grades weekly to keep insights accurate.`,
		});
	}

	if (targetGpa !== null && completed.length > 0 && cgpa < targetGpa) {
		reminders.push({
			id: "target-gpa-risk",
			type: "warning",
			title: "Target alert",
			message: `Current CGPA (${cgpa.toFixed(2)}) is below your target (${targetGpa.toFixed(2)}).`,
		});
	}

	const lowCourses = completed
		.filter((course) => course.grade && gradeToPoints(course.grade) <= 2.5)
		.slice(0, 2);

	for (const course of lowCourses) {
		reminders.push({
			id: `low-${course.id}`,
			type: "warning",
			title: `Focus on ${course.courseCode}`,
			message: "Low grade detected. Schedule focused revision and practice this week.",
		});
	}

	return reminders;
}

export function NotificationCenter() {
	const pathname = usePathname();
	const { user } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [reminders, setReminders] = useState<Reminder[]>([]);
	const [readIds, setReadIds] = useState<string[]>([]);
	const [toastReminder, setToastReminder] = useState<Reminder | null>(null);

	useEffect(() => {
		let isMounted = true;

		const loadReminders = async () => {
			if (!user) {
				if (isMounted) {
					setReminders([]);
					setReadIds([]);
					setToastReminder(null);
				}
				return;
			}

			const [courses, targetGpa, base] = await Promise.all([
				getUserCourses(user.id),
				getUserTargetGpa(user.id),
				getUserAcademicBase(user.id),
			]);

			if (!isMounted) return;

			const nextReminders = buildReminders(courses, targetGpa, base);
			const storedReadIds = getReadNotificationIds(user.id);
			setReminders(nextReminders);
			setReadIds(
				storedReadIds.filter((id) => nextReminders.some((item) => item.id === id)),
			);
		};

		void loadReminders();

		return () => {
			isMounted = false;
		};
	}, [user, pathname]);

	useEffect(() => {
		if (!user) return;
		saveReadNotificationIds(user.id, readIds);
	}, [readIds, user]);

	const unreadCount = useMemo(
		() => reminders.filter((item) => !readIds.includes(item.id)).length,
		[reminders, readIds],
	);

	useEffect(() => {
		if (isOpen || unreadCount === 0) {
			setToastReminder(null);
			return;
		}

		const firstUnread = reminders.find((item) => !readIds.includes(item.id));
		setToastReminder(firstUnread || null);
	}, [reminders, readIds, unreadCount, isOpen]);

	const markAllRead = () => {
		setReadIds(reminders.map((item) => item.id));
	};

	if (!user) return null;

	return (
		<>
			<div className={`dropdown dropdown-end ${isOpen ? "dropdown-open" : ""}`}>
				<button
					type="button"
					className="btn btn-ghost btn-circle"
					onClick={() => {
						const next = !isOpen;
						setIsOpen(next);
						if (next) {
							markAllRead();
						}
					}}
					aria-label="Notifications"
				>
					<div className="indicator">
						<Bell className="w-5 h-5" />
						{unreadCount > 0 && (
							<span className="badge badge-primary badge-xs indicator-item">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						)}
					</div>
				</button>

				<div className="dropdown-content mt-3 z-20 card card-compact w-80 bg-base-100 shadow-xl">
					<div className="card-body">
						<h3 className="font-semibold">Notifications</h3>
						{reminders.length === 0 ? (
							<p className="text-sm opacity-70">No reminders right now.</p>
						) : (
							<ul className="space-y-2">
								{reminders.map((item) => (
									<li
										key={item.id}
										className={`p-3 rounded-lg border ${
											item.type === "warning"
												? "border-warning/40 bg-warning/10"
												: "border-base-300 bg-base-200"
										}`}
									>
										<p className="font-medium text-sm">{item.title}</p>
										<p className="text-xs opacity-80">{item.message}</p>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>

			{toastReminder && (
				<div className="toast toast-end z-50">
					<div
						className={`alert ${
							toastReminder.type === "warning" ? "alert-warning" : "alert-info"
						}`}
					>
						<div>
							<span className="font-semibold">{toastReminder.title}</span>
							<div className="text-xs">{toastReminder.message}</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
