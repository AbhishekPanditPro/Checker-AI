// app/api/ask/route.ts
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
You are an assistant that extracts factual claims.

Return ONLY a JSON array of strings.
Each item should be one claim.
Also, can you add a smiley or sad emoji at the end if the information is correct or not. Do not write sad, happy for the emoji!.

Example:
[
  "Claim 1 ...",
  "Claim 2 ...",
  "Claim 3 ..."
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
