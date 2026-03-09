import { NextRequest, NextResponse } from 'next/server';
import { callWorker } from '../../../lib/worker';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json();
  const { data, status } = await callWorker('/auth/register', { method: 'POST', body });
  return NextResponse.json(data, { status });
}
