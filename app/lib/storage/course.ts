import type { Course, CreateCourseInput, Grade } from "../schemas/course";
import { supabase } from "../supabase/client";

type CourseRow = {
	id: string;
	user_id: string;
	course_code: string;
	title: string;
	units: number;
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

const VALID_GRADES: Grade[] = ["A", "B+", "B", "C+", "C", "D+", "D", "E", "F"];

function toGrade(value: string | null): Grade | undefined {
	if (!value) return undefined;
	return VALID_GRADES.includes(value as Grade) ? (value as Grade) : undefined;
}

function mapRowToCourse(row: CourseRow): Course {
	return {
		id: row.id,
		userId: row.user_id,
		courseCode: row.course_code,
		title: row.title,
		units: row.units,
		grade: toGrade(row.grade),
		targetGrade: toGrade(row.target_grade),
		currentScore: row.current_score ?? 0,
		maxAssessmentScore: row.max_assessment_score ?? 30,
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
	return ((data || []) as CourseRow[]).map(mapRowToCourse);
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

	return mapRowToCourse(created as CourseRow);
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

	return mapRowToCourse(updated as CourseRow);
}

/**
 * Delete course
 */
export async function deleteCourse(id: string): Promise<void> {
	const { error } = await supabase.from("courses").delete().eq("id", id);
	if (error) throw new Error(error.message);
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
