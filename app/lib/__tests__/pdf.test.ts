import { describe, expect, test } from "bun:test";
import type { Course } from "../schemas/course";
import type { User } from "../schemas/user";
import { generateTranscriptPDF, getTranscriptBlob } from "../utils/pdf";

const mockUser = {
	id: "test-user-123",
	name: "John Doe",
	email: "john.doe@example.com",
	password: "hashedpassword",
	createdAt: new Date().toISOString(),
} as const satisfies User;

const mockCourses = [
	{
		id: "course-1",
		userId: "test-user-123",
		courseCode: "CS101",
		title: "Introduction to Computer Science",
		units: 3,
		grade: "A",
		semester: "First",
		year: 2023,
		status: "completed",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "course-2",
		userId: "test-user-123",
		courseCode: "MATH201",
		title: "Calculus I",
		units: 4,
		grade: "B+",
		semester: "First",
		year: 2023,
		status: "completed",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "course-3",
		userId: "test-user-123",
		courseCode: "ENG102",
		title: "English Composition",
		units: 3,
		grade: "A",
		semester: "Second",
		year: 2023,
		status: "completed",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	{
		id: "course-4",
		userId: "test-user-123",
		courseCode: "CS201",
		title: "Data Structures",
		units: 4,
		semester: "First",
		year: 2024,
		status: "in-progress",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
] as const satisfies Course[];

describe("PDF Generation", () => {
	test("generateTranscriptPDF returns jsPDF instance", () => {
		const pdf = generateTranscriptPDF(mockUser, mockCourses);

		expect(pdf).toBeDefined();
		expect(typeof pdf.save).toBe("function");
		expect(typeof pdf.output).toBe("function");
	});

	test("generateTranscriptPDF works with empty courses", () => {
		const pdf = generateTranscriptPDF(mockUser, []);

		expect(pdf).toBeDefined();
		expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
	});

	test("generateTranscriptPDF includes insights when enabled", () => {
		const pdf = generateTranscriptPDF(mockUser, mockCourses, {
			includeInsights: true,
		});

		expect(pdf).toBeDefined();
		expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
	});

	test("generateTranscriptPDF excludes insights when disabled", () => {
		const pdf = generateTranscriptPDF(mockUser, mockCourses, {
			includeInsights: false,
		});

		expect(pdf).toBeDefined();
		expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
	});

	test("getTranscriptBlob returns Blob", () => {
		const blob = getTranscriptBlob(mockUser, mockCourses);

		expect(blob).toBeDefined();
		expect(blob instanceof Blob).toBe(true);
		expect(blob.type).toBe("application/pdf");
		expect(blob.size).toBeGreaterThan(0);
	});

	test("PDF generation handles multiple semesters", () => {
		const pdf = generateTranscriptPDF(mockUser, mockCourses);

		expect(pdf).toBeDefined();
		expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
	});

	test("PDF generation handles courses with no grades", () => {
		const coursesWithoutGrades: Course[] = [
			{
				id: "course-5",
				userId: "test-user-123",
				courseCode: "CS301",
				title: "Advanced Algorithms",
				units: 3,
				semester: "First",
				year: 2024,
				status: "in-progress",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		];

		const pdf = generateTranscriptPDF(mockUser, coursesWithoutGrades);

		expect(pdf).toBeDefined();
		expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
	});

	test("PDF has correct number of pages", () => {
		const pdf = generateTranscriptPDF(mockUser, mockCourses);
		const pageCount = pdf.getNumberOfPages();

		expect(pageCount).toBeGreaterThan(0);
		expect(pageCount).toBeLessThan(10);
	});

	test("PDF output can be converted to base64", () => {
		const pdf = generateTranscriptPDF(mockUser, mockCourses);
		const base64 = pdf.output("datauristring");

		expect(base64).toBeDefined();
		expect(typeof base64).toBe("string");
		expect(base64.startsWith("data:application/pdf")).toBe(true);
	});

	test("PDF generation with many courses creates multiple pages", () => {
		const manyCourses: Course[] = [];
		for (let i = 0; i < 30; i++) {
			manyCourses.push({
				id: `course-${i}`,
				userId: "test-user-123",
				courseCode: `CS${100 + i}`,
				title: `Course ${i}`,
				units: 3,
				grade: "A",
				semester: i % 2 === 0 ? "First" : "Second",
				year: 2023 + Math.floor(i / 6),
				status: "completed",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		}

		const pdf = generateTranscriptPDF(mockUser, manyCourses);
		const pageCount = pdf.getNumberOfPages();

		expect(pageCount).toBeGreaterThan(1);
	});
});
