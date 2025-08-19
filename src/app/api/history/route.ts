import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Note: persistence removed because serverless platforms (Vercel) have ephemeral filesystems.
// This endpoint accepts history POSTs and echoes the created entry but does not persist it.

export async function GET() {
  // Return empty array (no persistent history available)
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  try {
    const { question, answer, evaluation } = await req.json().catch(() => ({}));
    if (!question || !answer || !evaluation) {
      return NextResponse.json({ error: 'question, answer and evaluation required' }, { status: 400 });
    }
    const entry = { id: Date.now(), question, answer, evaluation, ts: new Date().toISOString() };
    // echo back the entry (no disk write)
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
