import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../../lib/worker';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const sp = request.nextUrl.searchParams;
  const { data, status } = await callWorker('/game/best-time', {
    token,
    searchParams: {
      deck_id: sp.get('deck_id') || '',
      game_type: sp.get('game_type') || 'match',
    },
  });
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const body = await request.json();
  const { data, status } = await callWorker('/game/best-time', { method: 'POST', body, token });
  return NextResponse.json(data, { status });
}
