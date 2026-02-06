import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Course } from "../schemas/course";
import type { User } from "../schemas/user";
import {
	calculateCGPA,
	calculateDegreeProgress,
	generateInsights,
	getSemesterPerformance,
	getTotalCoursesCompleted,
	getTotalCredits,
} from "./gpa";

interface PDFOptions {
	includeInsights?: boolean;
	includeCharts?: boolean;
}

/**
 * Generate academic transcript PDF
 */
export function generateTranscriptPDF(
	user: User,
	courses: Course[],
	options: PDFOptions = {},
): jsPDF {
	const doc = new jsPDF();
	const { includeInsights = true } = options;

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	let yPosition = 20;

	// Header
	doc.setFontSize(20);
	doc.setFont("helvetica", "bold");
	doc.text("Academic Transcript", pageWidth / 2, yPosition, {
		align: "center",
	});

	yPosition += 10;
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(
		`Generated on ${new Date().toLocaleDateString()}`,
		pageWidth / 2,
		yPosition,
		{ align: "center" },
	);

	yPosition += 15;

	// Student Information
	doc.setFontSize(14);
	doc.setFont("helvetica", "bold");
	doc.text("Student Information", 14, yPosition);

	yPosition += 8;
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(`Name: ${user.name}`, 14, yPosition);
	yPosition += 6;
	doc.text(`Email: ${user.email}`, 14, yPosition);
	yPosition += 6;
	doc.text(
		`Student ID: ${user.id.substring(0, 8).toUpperCase()}`,
		14,
		yPosition,
	);

	yPosition += 15;

	// Academic Summary
	const cgpa = calculateCGPA(courses);
	const totalCredits = getTotalCredits(courses);
	const completedCourses = getTotalCoursesCompleted(courses);
	const degreeProgress = calculateDegreeProgress(totalCredits);

	doc.setFontSize(14);
	doc.setFont("helvetica", "bold");
	doc.text("Academic Summary", 14, yPosition);

	yPosition += 8;
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(`Cumulative GPA (CGPA): ${cgpa.toFixed(2)} / 5.0`, 14, yPosition);
	yPosition += 6;
	doc.text(`Total Credits Completed: ${totalCredits} / 120`, 14, yPosition);
	yPosition += 6;
	doc.text(`Courses Completed: ${completedCourses}`, 14, yPosition);
	yPosition += 6;
	doc.text(`Degree Progress: ${degreeProgress.toFixed(1)}%`, 14, yPosition);

	yPosition += 15;

	// Semester Performance
	const semesterPerformance = getSemesterPerformance(courses);

	if (semesterPerformance.length > 0) {
		doc.setFontSize(14);
		doc.setFont("helvetica", "bold");
		doc.text("Semester Performance", 14, yPosition);
		yPosition += 8;

		autoTable(doc, {
			startY: yPosition,
			head: [["Semester", "Year", "GPA"]],
			body: semesterPerformance.map((sem) => [
				sem.semester,
				sem.year.toString(),
				sem.gpa.toFixed(2),
			]),
			theme: "striped",
			headStyles: { fillColor: [87, 13, 248] },
			margin: { left: 14, right: 14 },
		});

		//@ts-expect-error - jspdf-autotable extends jsPDF with lastAutoTable property
		yPosition = doc.lastAutoTable.finalY + 15;
	}

	// Course List grouped by semester
	if (courses.length > 0) {
		// Check if we need a new page
		if (yPosition > pageHeight - 60) {
			doc.addPage();
			yPosition = 20;
		}

		doc.setFontSize(14);
		doc.setFont("helvetica", "bold");
		doc.text("Course Details", 14, yPosition);
		yPosition += 8;

		// Group courses by semester and year
		const groupedCourses = new Map<
			string,
			{ courses: Course[]; year: number }
		>();

		for (const course of courses) {
			const key = `${course.semester}-${course.year}`;
			if (!groupedCourses.has(key)) {
				groupedCourses.set(key, { courses: [], year: course.year });
			}
			groupedCourses.get(key)?.courses.push(course);
		}

		// Sort by year and semester
		const sortedGroups = Array.from(groupedCourses.entries()).sort(
			([keyA, { year: yearA }], [keyB, { year: yearB }]) => {
				if (yearA !== yearB) return yearA - yearB;
				return keyA.localeCompare(keyB);
			},
		);

		for (const [key, { courses: semesterCourses }] of sortedGroups) {
			const [semester, year] = key.split("-");

			// Check if we need a new page
			if (yPosition > pageHeight - 40) {
				doc.addPage();
				yPosition = 20;
			}

			doc.setFontSize(12);
			doc.setFont("helvetica", "bold");
			doc.text(`${semester} Semester ${year}`, 14, yPosition);
			yPosition += 6;

			autoTable(doc, {
				startY: yPosition,
				head: [["Course Code", "Title", "Units", "Grade", "Status"]],
				body: semesterCourses.map((course) => [
					course.courseCode,
					course.title,
					course.units.toString(),
					course.grade || "-",
					course.status === "completed" ? "Completed" : "In Progress",
				]),
				theme: "grid",
				headStyles: { fillColor: [87, 13, 248], fontSize: 9 },
				bodyStyles: { fontSize: 9 },
				margin: { left: 14, right: 14 },
			});

			//@ts-expect-error - jspdf-autotable extends jsPDF with lastAutoTable property
			yPosition = doc.lastAutoTable.finalY + 10;
		}
	}

	// Academic Insights
	if (includeInsights && courses.length > 0) {
		const insights = generateInsights(courses);

		if (insights.length > 0) {
			// Check if we need a new page
			if (yPosition > pageHeight - 60) {
				doc.addPage();
				yPosition = 20;
			}

			doc.setFontSize(14);
			doc.setFont("helvetica", "bold");
			doc.text("Academic Insights", 14, yPosition);
			yPosition += 8;

			doc.setFontSize(10);
			doc.setFont("helvetica", "normal");

			for (const insight of insights) {
				const lines = doc.splitTextToSize(
					`• ${insight}`,
					pageWidth - 28,
				) as string[];

				// Check if we need a new page
				if (yPosition + lines.length * 6 > pageHeight - 20) {
					doc.addPage();
					yPosition = 20;
				}

				for (const line of lines) {
					doc.text(line, 14, yPosition);
					yPosition += 6;
				}
			}
		}
	}

	// Footer on all pages
	const totalPages = doc.getNumberOfPages();
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setFont("helvetica", "italic");
		doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, {
			align: "center",
		});
		doc.text("Academic Progress Tracker", 14, pageHeight - 10);
	}

	return doc;
}

/**
 * Download transcript as PDF
 */
export function downloadTranscript(
	user: User,
	courses: Course[],
	options?: PDFOptions,
): void {
	const doc = generateTranscriptPDF(user, courses, options);
	const filename = `transcript_${user.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
	doc.save(filename);
}

/**
 * Get transcript as blob for upload or preview
 */
export function getTranscriptBlob(
	user: User,
	courses: Course[],
	options?: PDFOptions,
): Blob {
	const doc = generateTranscriptPDF(user, courses, options);
	return doc.output("blob");
}
