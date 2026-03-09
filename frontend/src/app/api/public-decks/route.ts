import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../lib/worker';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const sort = request.nextUrl.searchParams.get('sort') || 'newest';
  const { data, status } = await callWorker('/public-decks', { token, searchParams: { sort } });
  return NextResponse.json(data, { status });
}
