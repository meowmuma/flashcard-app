import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../lib/worker';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const { data, status } = await callWorker('/decks', { token });
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const body = await request.json();
  const { data, status } = await callWorker('/decks', { method: 'POST', body, token });
  return NextResponse.json(data, { status });
}
