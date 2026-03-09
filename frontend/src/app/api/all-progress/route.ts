import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../lib/worker';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const { data, status } = await callWorker('/all-progress', { token });
  return NextResponse.json(data, { status });
}
