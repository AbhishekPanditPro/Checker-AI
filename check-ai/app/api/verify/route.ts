// app/api/query/route.ts
import { NextResponse } from "next/server";
import { ai } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const { prompt, systemPrompt } = await req.json();

    const groundingTool = {
      googleSearch: {},
    };

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash", // or whichever model you're using
      contents: [
        {
          role: "user",
          parts: [
            {
              // 👇 We tell the model EXACTLY how to format the output
              text: `
You are a Data Verification Assistant.

Your task is to analyze a set of user claims, verify their accuracy, and provide corrective, fact-based information.

Strict Output Requirements:
1. Return ONLY a JSON array of strings.
2. Each string in the array must be a single, verified fact.
3. For claims that are incorrect, the corresponding fact string must provide the accurate, statistically-backed data to correct the claim.
4. For claims that are correct, the corresponding fact string must simply re-state and confirm the claim's truth (e.g., "The claim that X is true is confirmed.").
5. You must address every claim provided by the user: one fact for one claim.

Example Output Format:
[
  "Fact 1 (Correction or Confirmation)...",
  "Fact 2 (Correction or Confirmation)...",
  "Fact 3 (Correction or Confirmation)..."
]
User query:
${prompt}
              `.trim(),
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          systemPrompt ??
          "You are a careful assistant who only outputs valid JSON.",
        tools: [groundingTool],
      },
    });

    const text = result.text;
    // console.log(text);
    console.log(result);

    return NextResponse.json({ text });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to call Gemini" },
      { status: 500 }
    );
  }
}
