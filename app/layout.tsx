import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Academic Progress Tracker",
	description: "Track your CGPA and academic journey",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
