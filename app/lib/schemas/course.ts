import * as v from "valibot";

export const GradeSchema = v.picklist([
	"A",
	"B+",
	"B",
	"C+",
	"C",
	"D+",
	"D",
	"E",
	"F",
]);

export const CourseSchema = v.object({
	id: v.string(),
	userId: v.string(),
	courseCode: v.pipe(
		v.string(),
		v.minLength(1, "Course code is required"),
		v.maxLength(20, "Course code must be less than 20 characters"),
	),
	title: v.pipe(
		v.string(),
		v.minLength(1, "Course title is required"),
		v.maxLength(100, "Course title must be less than 100 characters"),
	),
	units: v.pipe(
		v.number(),
		v.minValue(1, "Units must be at least 1"),
		v.maxValue(10, "Units must be at most 10"),
	),
	grade: v.optional(GradeSchema),
	semester: v.picklist(
		["First", "Second", "Summer"],
		"Semester must be First, Second, or Summer",
	),
	year: v.pipe(
		v.number(),
		v.minValue(2000, "Year must be at least 2000"),
		v.maxValue(2100, "Year must be at most 2100"),
	),
	status: v.picklist(["in-progress", "completed"]),
	createdAt: v.string(),
	updatedAt: v.string(),
});

export const CreateCourseSchema = v.object({
	courseCode: v.pipe(
		v.string(),
		v.minLength(1, "Course code is required"),
		v.maxLength(20, "Course code must be less than 20 characters"),
	),
	title: v.pipe(
		v.string(),
		v.minLength(1, "Course title is required"),
		v.maxLength(100, "Course title must be less than 100 characters"),
	),
	units: v.pipe(
		v.number(),
		v.minValue(1, "Units must be at least 1"),
		v.maxValue(10, "Units must be at most 10"),
	),
	grade: v.optional(GradeSchema),
	semester: v.picklist(
		["First", "Second", "Summer"],
		"Semester must be First, Second, or Summer",
	),
	year: v.pipe(
		v.number(),
		v.minValue(2000, "Year must be at least 2000"),
		v.maxValue(2100, "Year must be at most 2100"),
	),
	status: v.picklist(["in-progress", "completed"]),
});

export type Grade = v.InferOutput<typeof GradeSchema>;
export type Course = v.InferOutput<typeof CourseSchema>;
export type CreateCourseInput = v.InferInput<typeof CreateCourseSchema>;
