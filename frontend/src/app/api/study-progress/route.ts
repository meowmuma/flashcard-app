import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../lib/worker';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const sp = request.nextUrl.searchParams;
  const { data, status } = await callWorker('/study-progress', {
    token,
    searchParams: {
      deck_id: sp.get('deck_id') || '',
      session_type: sp.get('session_type') || 'study',
    },
  });
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const body = await request.json();
  const { data, status } = await callWorker('/study-progress', { method: 'POST', body, token });
  return NextResponse.json(data, { status });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const token = extractToken(request);
  const sp = request.nextUrl.searchParams;
  const { data, status } = await callWorker('/study-progress', {
    method: 'DELETE',
    token,
    searchParams: {
      deck_id: sp.get('deck_id') || '',
      session_type: sp.get('session_type') || 'study',
    },
  });
  return NextResponse.json(data, { status });
}
