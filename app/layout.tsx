import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "PAPT | Personalized Academic Progress Tracker",
	description:
		"Personalized Academic Progress Tracker (PAPT) helps students monitor CGPA, track coursework, and gain AI-powered academic insights.",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "PAPT",
	},
	formatDetection: {
		telephone: false,
	},
	icons: {
		icon: [
			{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
		],
		shortcut: [{ url: "/favicon.ico" }],
		apple: [{ url: "/icon-192x192.png", sizes: "192x192" }],
	},
	other: {
		"theme-color": "#3b82f6",
		"mobile-web-app-capable": "yes",
		"mobile-web-app-status-bar-style": "black-translucent",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	userScalable: true,
	viewportFit: "cover",
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
