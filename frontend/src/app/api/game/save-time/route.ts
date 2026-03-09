import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../../lib/worker';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const body = await request.json();
  const { data, status } = await callWorker('/game/save-time', { method: 'POST', body, token });
  return NextResponse.json(data, { status });
}
