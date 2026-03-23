import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  try {
    const { description, type, severity } = await request.json();

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI summarization is not configured" },
        { status: 503 }
      );
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are a residence life incident report assistant. Rewrite the following incident description into a clear, professional report format suitable for official records.

Incident Type: ${type?.replace("_", " ") || "General"}
Severity: ${severity || "Medium"}
Original Description: ${description}

Write a concise, professional summary in 2-3 paragraphs. Include:
1. What happened (facts only)
2. Who was involved and where
3. Any immediate actions taken or needed

Use formal, objective language. Do not add information not present in the original.`,
        },
      ],
    });

    const summary =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("AI summarize error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
