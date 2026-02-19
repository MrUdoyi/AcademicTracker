import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Academic Progress Tracker",
	description: "Track your CGPA and academic journey with AI-powered insights and offline-first capabilities",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "AcademicTracker",
	},
	formatDetection: {
		telephone: false,
	},
	viewport: "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover",
	icons: {
		icon: [
			{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [{ url: "/icon-192x192.png", sizes: "192x192" }],
	},
	other: {
		"theme-color": "#3b82f6",
		"mobile-web-app-capable": "yes",
		"mobile-web-app-status-bar-style": "black-translucent",
	},
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
