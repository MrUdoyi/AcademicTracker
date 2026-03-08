import type { Course, CreateCourseInput, Grade } from "../schemas/course";
import { storage } from "./base";
import { supabase } from "../supabase/client";

type CourseRow = {
	id: string;
	user_id: string;
	course_code: string;
	title: string;
	units: number;
	level: number | null;
	grade: string | null;
	target_grade: string | null;
	current_score: number | null;
	max_assessment_score: number | null;
	semester: "First" | "Second" | "Summer";
	year: number;
	status: "in-progress" | "completed";
	created_at: string;
	updated_at: string;
};

const VALID_GRADES: Grade[] = ["A", "B", "C", "D", "E", "F"];
const COURSE_CACHE_KEY_PREFIX = "apt_courses_cache";
const LEGACY_GRADE_ALIASES: Record<string, Grade> = {
	"B+": "B",
	"C+": "C",
	"D+": "D",
};

function getCoursesCacheKey(userId: string): string {
	return `${COURSE_CACHE_KEY_PREFIX}:${userId}`;
}

function saveCoursesCache(userId: string, courses: Course[]): void {
	storage.set(getCoursesCacheKey(userId), courses);
}

function getCoursesCache(userId: string): Course[] {
	const cached = storage.get<Course[]>(getCoursesCacheKey(userId));
	if (!Array.isArray(cached)) return [];
	return cached;
}

function clearCoursesCache(userId: string): void {
	storage.remove(getCoursesCacheKey(userId));
}

function toGrade(value: string | null): Grade | undefined {
	if (!value) return undefined;

	const normalizedValue = value.trim().toUpperCase();
	const mappedValue = LEGACY_GRADE_ALIASES[normalizedValue] ?? normalizedValue;

	return VALID_GRADES.includes(mappedValue as Grade)
		? (mappedValue as Grade)
		: undefined;
}

function toMaxAssessmentScore(value: number | null): 30 | 40 {
	return value === 40 ? 40 : 30;
}

function toCourseLevel(value: number | null): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return 100;
	const normalized = Math.trunc(value);
	if (normalized < 100 || normalized > 900) return 100;
	return normalized;
}

function mapRowToCourse(row: CourseRow): Course {
	return {
		id: row.id,
		userId: row.user_id,
		courseCode: row.course_code,
		title: row.title,
		units: row.units,
			level: toCourseLevel(row.level),
		grade: toGrade(row.grade),
		targetGrade: toGrade(row.target_grade),
		currentScore: row.current_score ?? 0,
		maxAssessmentScore: toMaxAssessmentScore(row.max_assessment_score),
		semester: row.semester,
		year: row.year,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * Get all courses from storage
 */
export async function getCourses(): Promise<Course[]> {
	const { data, error } = await supabase
		.from("courses")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) throw new Error(error.message);
	return ((data || []) as CourseRow[]).map(mapRowToCourse);
}

/**
 * Get courses for specific user
 */
export async function getUserCourses(userId: string): Promise<Course[]> {
	const { data, error } = await supabase
		.from("courses")
		.select("*")
		.eq("user_id", userId)
		.order("year", { ascending: false });

	if (error) throw new Error(error.message);

	const mappedCourses = ((data || []) as CourseRow[]).map(mapRowToCourse);
	saveCoursesCache(userId, mappedCourses);
	return mappedCourses;
}

export function getCachedUserCourses(userId: string): Course[] {
	return getCoursesCache(userId);
}

/**
 * Get course by ID
 */
export async function getCourseById(id: string): Promise<Course | null> {
	const { data, error } = await supabase
		.from("courses")
		.select("*")
		.eq("id", id)
		.single();

	if (error) return null;
	return mapRowToCourse(data as CourseRow);
}

/**
 * Create new course
 */
export async function createCourse(userId: string, data: CreateCourseInput): Promise<Course> {
	const payload = {
		user_id: userId,
		course_code: data.courseCode,
		title: data.title,
		units: data.units,
		level: data.level ?? 100,
		grade: data.grade || null,
		target_grade: data.targetGrade || null,
		current_score: data.currentScore ?? 0,
		max_assessment_score: data.maxAssessmentScore ?? 30,
		semester: data.semester,
		year: data.year,
		status: data.status,
	};

	const { data: created, error } = await supabase
		.from("courses")
		.insert(payload)
		.select("*")
		.single();

	if (error || !created) {
		throw new Error(error?.message || "Failed to create course");
	}

	const mappedCourse = mapRowToCourse(created as CourseRow);
	const currentCache = getCoursesCache(userId);
	saveCoursesCache(userId, [mappedCourse, ...currentCache]);
	return mappedCourse;
}

/**
 * Update existing course
 */
export async function updateCourse(
	id: string,
	data: Partial<CreateCourseInput>,
): Promise<Course> {
	const updates: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};

	if (data.courseCode !== undefined) updates.course_code = data.courseCode;
	if (data.title !== undefined) updates.title = data.title;
	if (data.units !== undefined) updates.units = data.units;
	if (data.level !== undefined) updates.level = data.level;
	if (data.grade !== undefined) updates.grade = data.grade || null;
	if (data.targetGrade !== undefined) updates.target_grade = data.targetGrade || null;
	if (data.currentScore !== undefined) updates.current_score = data.currentScore;
	if (data.maxAssessmentScore !== undefined)
		updates.max_assessment_score = data.maxAssessmentScore;
	if (data.semester !== undefined) updates.semester = data.semester;
	if (data.year !== undefined) updates.year = data.year;
	if (data.status !== undefined) updates.status = data.status;

	const { data: updated, error } = await supabase
		.from("courses")
		.update(updates)
		.eq("id", id)
		.select("*")
		.single();

	if (error || !updated) {
		throw new Error(error?.message || "Course not found");
	}

	const mappedCourse = mapRowToCourse(updated as CourseRow);
	const currentCache = getCoursesCache(mappedCourse.userId);
	saveCoursesCache(
		mappedCourse.userId,
		currentCache.map((course) => (course.id === mappedCourse.id ? mappedCourse : course)),
	);
	return mappedCourse;
}

/**
 * Delete course
 */
export async function deleteCourse(id: string): Promise<void> {
	const targetCourse = await getCourseById(id);
	const { error } = await supabase.from("courses").delete().eq("id", id);
	if (error) throw new Error(error.message);

	if (targetCourse) {
		const currentCache = getCoursesCache(targetCourse.userId);
		saveCoursesCache(
			targetCourse.userId,
			currentCache.filter((course) => course.id !== id),
		);
	}
}

/**
 * Delete all courses for a user
 */
export async function clearUserCourses(userId: string): Promise<void> {
	const { error } = await supabase.from("courses").delete().eq("user_id", userId);
	if (error) throw new Error(error.message);
	clearCoursesCache(userId);
}

/**
 * Get courses grouped by semester
 */
export async function getCoursesBySemester(userId: string): Promise<Record<string, Course[]>> {
	const courses = await getUserCourses(userId);
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
