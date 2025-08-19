import { NextResponse } from 'next/server';
import { runOnce } from '@/lib/runner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const result = await runOnce();
  return NextResponse.json(result);
}

export async function POST() {
  const result = await runOnce();
  return NextResponse.json(result);
}
