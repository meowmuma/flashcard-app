import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../../../lib/worker';

export async function POST(request: NextRequest, { params }: { params: { deckId: string } }): Promise<NextResponse> {
  const token = extractToken(request);
  const { data, status } = await callWorker(`/public-decks/${params.deckId}/copy`, { method: 'POST', token });
  return NextResponse.json(data, { status });
}
