"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const AVAILABLE_MODELS = [
	"gemini-2.5-pro",
	"gemini-2.5-flash",
	"gemini-2.5-flash-lite",
	"gemini-2.0-flash",
	"gemini-2.0-flash-lite",
] as const;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface GeminiResponse {
	success: boolean;
	text?: string;
	model?: string;
	error?: string;
	details?: string;
}

/**
 * Generate content using Gemini AI
 */
export async function generateGeminiContent(
	prompt: string,
	models: ReadonlyArray<string> = AVAILABLE_MODELS,
): Promise<GeminiResponse> {
	try {
		if (!prompt || prompt.trim().length === 0) {
			return {
				success: false,
				error: "Prompt is required",
			};
		}

		if (!process.env.GEMINI_API_KEY) {
			return {
				success: false,
				error: "Gemini API key is not configured",
			};
		}

		const model = models[0];

		if (!model)
			return {
				success: false,
				error: "Available models exhausted. Try again later",
			};

		const genModel = genAI.getGenerativeModel({ model });
		const result = await genModel.generateContent(prompt);
		const text = result.response.text();

		return {
			success: true,
			text,
			model,
		};
	} catch (error: unknown) {
		console.error(
			"Gemini API Error:",
			error,
			"The failed model was:",
			models[0],
			"Trying other models...",
		);

		return generateGeminiContent(prompt, models.slice(1));
	}
}
