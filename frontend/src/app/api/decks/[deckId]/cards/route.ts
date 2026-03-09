import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../../../lib/worker';

export async function POST(request: NextRequest, { params }: { params: { deckId: string } }): Promise<NextResponse> {
  const token = extractToken(request);
  const body = await request.json();
  const { data, status } = await callWorker(`/decks/${params.deckId}/cards`, { method: 'POST', body, token });
  return NextResponse.json(data, { status });
}
