import { v4 as uuidv4 } from "uuid";
import type { LoginInput, RegisterInput, User } from "../schemas/user";
import { storage } from "./base";

const USERS_KEY = "apt_users";
const CURRENT_USER_KEY = "apt_current_user";

/**
 * Get all users from storage
 */
export function getUsers(): User[] {
	return storage.get<User[]>(USERS_KEY) || [];
}

/**
 * Get user by ID
 */
export function getUserById(id: string): User | null {
	const users = getUsers();
	return users.find((user) => user.id === id) || null;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): User | null {
	const users = getUsers();
	return users.find((user) => user.email === email) || null;
}

/**
 * Create new user (registration)
 */
export function createUser(data: RegisterInput): User {
	const users = getUsers();

	const existingUser = getUserByEmail(data.email);
	if (existingUser) {
		throw new Error("User with this email already exists");
	}

	const newUser: User = {
		id: uuidv4(),
		email: data.email,
		name: data.name,
		password: data.password,
		createdAt: new Date().toISOString(),
	};

	users.push(newUser);
	storage.set(USERS_KEY, users);

	return newUser;
}

/**
 * Authenticate user (login)
 */
export function authenticateUser(data: LoginInput): User {
	const user = getUserByEmail(data.email);

	if (!user) {
		throw new Error("Invalid email or password");
	}

	if (user.password !== data.password) {
		throw new Error("Invalid email or password");
	}

	return user;
}

/**
 * Get current logged-in user
 */
export function getCurrentUser(): User | null {
	const userId = storage.get<string>(CURRENT_USER_KEY);
	if (!userId) return null;

	return getUserById(userId);
}

/**
 * Set current user (after login)
 */
export function setCurrentUser(user: User): void {
	storage.set(CURRENT_USER_KEY, user.id);
}

/**
 * Logout current user
 */
export function logout(): void {
	storage.remove(CURRENT_USER_KEY);
}
