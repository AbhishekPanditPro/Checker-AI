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
Important: It is very important to add a smiley or sad emoji at the end of the each claim whether information is correct or not. Do not write the text sad, happy for the emoji!.
Important: There are some cases where the factual infromation is bad like "the world was sad in great depression." this type of information is correct then add a smiley emoji else put a sad emoji

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
