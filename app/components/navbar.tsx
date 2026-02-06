"use client";

import {
	BarChart3,
	BookOpen,
	GraduationCap,
	LogOut,
	Menu,
	TrendingUp,
	User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "../lib/storage/user";

interface NavbarProps {
	userName?: string;
}

export function Navbar({ userName }: NavbarProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const handleLogout = () => {
		logout();
		router.push("/");
	};

	const closeMobileMenu = () => {
		setMobileMenuOpen(false);
	};

	const navLinks = [
		{ href: "/dashboard", label: "Dashboard", icon: BarChart3 },
		{ href: "/courses", label: "Courses", icon: BookOpen },
		{ href: "/analysis", label: "Analysis", icon: TrendingUp },
		{ href: "/profile", label: "Profile", icon: User },
	] as const;

	return (
		<nav className="navbar bg-base-100 shadow-lg sticky top-0 z-50">
			<div className="navbar-start">
				<Link href="/dashboard" className="btn btn-ghost text-xl gap-2">
					<GraduationCap className="w-6 h-6" />
					<span>APT</span>
				</Link>
			</div>

			<div className="navbar-center hidden lg:flex">
				<ul className="menu menu-horizontal px-1 gap-1">
					{navLinks.map((link) => {
						const Icon = link.icon;
						return (
							<li key={link.href}>
								<Link
									href={link.href}
									className={`btn btn-ghost btn-sm gap-2 ${
										pathname === link.href ? "btn-active" : ""
									}`}
								>
									<Icon className="w-4 h-4" />
									{link.label}
								</Link>
							</li>
						);
					})}
				</ul>
			</div>

			<div className="navbar-end gap-2">
				{userName && (
					<div className="hidden md:flex items-center gap-2 px-3">
						<span className="text-sm opacity-70">Welcome,</span>
						<span className="font-semibold">{userName}</span>
					</div>
				)}

				<button
					type="button"
					onClick={handleLogout}
					className="btn btn-error btn-sm hidden lg:flex gap-2"
					aria-label="Logout"
				>
					<LogOut className="w-4 h-4" />
					Logout
				</button>

				<div
					className={`dropdown dropdown-end lg:hidden ${mobileMenuOpen ? "dropdown-open" : ""}`}
				>
					<button
						type="button"
						tabIndex={0}
						className="btn btn-ghost btn-square"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						aria-label="Open menu"
						aria-expanded={mobileMenuOpen}
					>
						<Menu className="w-6 h-6" />
					</button>
					<ul className="menu menu-sm dropdown-content mt-3 z-10 p-2 shadow bg-base-100 rounded-box w-52">
						{userName && (
							<li className="menu-title">
								<span>Welcome, {userName}</span>
							</li>
						)}
						{navLinks.map((link) => {
							const Icon = link.icon;
							return (
								<li key={link.href}>
									<Link
										href={link.href}
										className={pathname === link.href ? "active" : ""}
										onClick={closeMobileMenu}
									>
										<Icon className="w-4 h-4" />
										{link.label}
									</Link>
								</li>
							);
						})}
						<li className="border-t mt-2 pt-2">
							<button
								type="button"
								onClick={() => {
									handleLogout();
									closeMobileMenu();
								}}
								className="text-error"
							>
								<LogOut className="w-4 h-4" />
								Logout
							</button>
						</li>
					</ul>
				</div>
			</div>
		</nav>
	);
}
