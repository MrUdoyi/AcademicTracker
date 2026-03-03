"use client";

import {
	BarChart3,
	BookOpen,
	CircleHelp,
	GraduationCap,
	LogOut,
	Menu,
	TrendingUp,
	User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { NotificationCenter } from "./notification-center";
import { logout } from "../lib/storage/user";

interface NavbarProps {
	userName?: string;
	onHelpClick?: () => void;
}

export function Navbar({ userName, onHelpClick }: NavbarProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const handleLogout = async () => {
		await logout();
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

			<div className="navbar-center hidden xl:flex">
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
				{onHelpClick && (
					<button
						type="button"
						onClick={onHelpClick}
						className="btn btn-ghost btn-sm gap-2 hidden xl:flex"
						aria-label="How to use this app"
					>
						<CircleHelp className="w-4 h-4" />
						How to use this app
					</button>
				)}

				<NotificationCenter />

				{userName && (
					<div className="hidden xl:flex items-center gap-2 px-2 min-w-0 max-w-44">
						<span className="text-sm opacity-70">Welcome,</span>
						<span className="font-semibold truncate">{userName}</span>
					</div>
				)}

				<button
					type="button"
					onClick={() => void handleLogout()}
					className="btn btn-error btn-sm hidden xl:flex gap-2"
					aria-label="Logout"
				>
					<LogOut className="w-4 h-4" />
					Logout
				</button>

				<div
					className={`dropdown dropdown-end xl:hidden ${mobileMenuOpen ? "dropdown-open" : ""}`}
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
						{onHelpClick && (
							<li>
								<button
									type="button"
									onClick={() => {
										onHelpClick();
										closeMobileMenu();
									}}
								>
									<CircleHelp className="w-4 h-4" />
									How to use this app
								</button>
							</li>
						)}
						<li className="border-t mt-2 pt-2">
							<button
								type="button"
								onClick={() => {
									void handleLogout();
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
