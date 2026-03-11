import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../../../../lib/worker';

export async function PUT(request: NextRequest, { params }: { params: { deckId: string, cardId: string } }): Promise<NextResponse> {
  const token = extractToken(request);
  const body = await request.json();
  const { data, status } = await callWorker(`/decks/${params.deckId}/cards/${params.cardId}`, { method: 'PUT', body, token });
  return NextResponse.json(data, { status });
}

export async function DELETE(request: NextRequest, { params }: { params: { deckId: string, cardId: string } }): Promise<NextResponse> {
  const token = extractToken(request);
  const { data, status } = await callWorker(`/decks/${params.deckId}/cards/${params.cardId}`, { method: 'DELETE', token });
  return NextResponse.json(data, { status });
}
