import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "edge"; // works great on Vercel

type Draft = {
  typedText: string;
  recordedText: string;
  updatedAt: number;
};

function keyFor(draftId: string) {
  return `draft:${draftId}`;
}

// GET /api/draft?draftId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const draftId = searchParams.get("draftId");

  if (!draftId) {
    return NextResponse.json({ error: "draftId is required" }, { status: 400 });
  }

  const draft = (await kv.get<Draft>(keyFor(draftId))) ?? {
    typedText: "",
    recordedText: "",
    updatedAt: Date.now(),
  };

  return NextResponse.json({ draftId, draft });
}

// POST /api/draft  { draftId, typedText, recordedText }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const draftId = String(body?.draftId ?? "");

    if (!draftId) {
      return NextResponse.json({ error: "draftId is required" }, { status: 400 });
    }

    const draft: Draft = {
      typedText: String(body?.typedText ?? ""),
      recordedText: String(body?.recordedText ?? ""),
      updatedAt: Date.now(),
    };

    // Store for 7 days (adjust if you want)
    await kv.set(keyFor(draftId), draft, { ex: 60 * 60 * 24 * 7 });

    return NextResponse.json({ ok: true, draftId, updatedAt: draft.updatedAt });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to save draft", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
