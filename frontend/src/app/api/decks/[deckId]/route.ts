import { NextRequest, NextResponse } from 'next/server';
import { callWorker, extractToken } from '../../../lib/worker';

export async function GET(request: NextRequest, { params }: { params: { deckId: string } }): Promise<NextResponse> {
  const token = extractToken(request);
  const { data, status } = await callWorker(`/decks/${params.deckId}`, { token });
  return NextResponse.json(data, { status });
}

export async function PUT(request: NextRequest, { params }: { params: { deckId: string } }): Promise<NextResponse> {
  const token = extractToken(request);
  const body = await request.json();
  const { data, status } = await callWorker(`/decks/${params.deckId}`, { method: 'PUT', body, token });
  return NextResponse.json(data, { status });
}

export async function DELETE(request: NextRequest, { params }: { params: { deckId: string } }): Promise<NextResponse> {
  const token = extractToken(request);
  const { data, status } = await callWorker(`/decks/${params.deckId}`, { method: 'DELETE', token });
  return NextResponse.json(data, { status });
}
