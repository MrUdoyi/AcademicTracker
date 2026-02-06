import * as v from "valibot";

export const UserSchema = v.object({
	id: v.string(),
	email: v.pipe(v.string(), v.email()),
	name: v.string(),
	password: v.string(),
	createdAt: v.string(),
});

export const LoginSchema = v.object({
	email: v.pipe(v.string(), v.email("Please enter a valid email")),
	password: v.pipe(
		v.string(),
		v.minLength(6, "Password must be at least 6 characters"),
	),
});

export const RegisterSchema = v.object({
	name: v.pipe(
		v.string(),
		v.minLength(2, "Name must be at least 2 characters"),
	),
	email: v.pipe(v.string(), v.email("Please enter a valid email")),
	password: v.pipe(
		v.string(),
		v.minLength(6, "Password must be at least 6 characters"),
	),
	confirmPassword: v.string(),
});

export type User = v.InferOutput<typeof UserSchema>;
export type LoginInput = v.InferInput<typeof LoginSchema>;
export type RegisterInput = v.InferInput<typeof RegisterSchema>;
