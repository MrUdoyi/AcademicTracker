import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication but should be protected by lock screen
const protectedRoutes = ["/dashboard", "/courses", "/analysis", "/profile"];

// Routes that are public
const publicRoutes = ["/", "/register", "/login", "/lock-screen", "/biometric-setup"];

export function middleware(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	// Skip middleware for public routes
	if (publicRoutes.some((route) => pathname === route)) {
		return NextResponse.next();
	}

	// For protected routes, the check will be done client-side via useBiometricStatus hook
	// since we need access to localStorage which isn't available in middleware
	return NextResponse.next();
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 */
		"/((?!_next/static|_next/image|favicon.ico).*)",
	],
};
