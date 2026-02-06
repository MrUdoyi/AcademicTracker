import { v4 as uuidv4 } from "uuid";
import type { Course, CreateCourseInput } from "../schemas/course";
import { storage } from "./base";

const COURSES_KEY = "apt_courses";

/**
 * Get all courses from storage
 */
export function getCourses(): Course[] {
	return storage.get<Course[]>(COURSES_KEY) || [];
}

/**
 * Get courses for specific user
 */
export function getUserCourses(userId: string): Course[] {
	const courses = getCourses();
	return courses.filter((course) => course.userId === userId);
}

/**
 * Get course by ID
 */
export function getCourseById(id: string): Course | null {
	const courses = getCourses();
	return courses.find((course) => course.id === id) || null;
}

/**
 * Create new course
 */
export function createCourse(userId: string, data: CreateCourseInput): Course {
	const courses = getCourses();

	const existingCourse = courses.find(
		(c) => c.userId === userId && c.courseCode === data.courseCode,
	);

	if (existingCourse) {
		throw new Error("Course with this code already exists");
	}

	const now = new Date().toISOString();
	const newCourse: Course = {
		id: uuidv4(),
		userId,
		...data,
		createdAt: now,
		updatedAt: now,
	};

	courses.push(newCourse);
	storage.set(COURSES_KEY, courses);

	return newCourse;
}

/**
 * Update existing course
 */
export function updateCourse(
	id: string,
	data: Partial<CreateCourseInput>,
): Course {
	const courses = getCourses();
	const index = courses.findIndex((course) => course.id === id);

	if (index === -1) {
		throw new Error("Course not found");
	}

	const updatedCourse: Course = {
		...courses[index],
		...data,
		updatedAt: new Date().toISOString(),
	};

	courses[index] = updatedCourse;
	storage.set(COURSES_KEY, courses);

	return updatedCourse;
}

/**
 * Delete course
 */
export function deleteCourse(id: string): void {
	const courses = getCourses();
	const filtered = courses.filter((course) => course.id !== id);

	if (filtered.length === courses.length) {
		throw new Error("Course not found");
	}

	storage.set(COURSES_KEY, filtered);
}

/**
 * Get courses grouped by semester
 */
export function getCoursesBySemester(userId: string): Record<string, Course[]> {
	const courses = getUserCourses(userId);
	const grouped: Record<string, Course[]> = {};

	for (const course of courses) {
		const key = `${course.semester} ${course.year}`;
		if (!grouped[key]) {
			grouped[key] = [];
		}
		grouped[key].push(course);
	}

	return grouped;
}
