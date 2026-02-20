import { NextResponse } from "next/server";
import { generateGeminiContent } from "../../lib/actions/gemini";

export async function POST(request: Request) {
	const body = await request.json().catch(() => ({}));
	const prompt = typeof body?.prompt === "string" ? body.prompt : "";

	if (!prompt.trim()) {
		return NextResponse.json(
			{ success: false, error: "Prompt is required" },
			{ status: 400 },
		);
	}

	const result = await generateGeminiContent(prompt);
	const status = result.success ? 200 : 500;

	return NextResponse.json(result, { status });
}
