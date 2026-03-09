import { NextRequest, NextResponse } from 'next/server';
import { callWorker } from '../../../../lib/worker';

export async function GET(
  _req: NextRequest,
  { params }: { params: { shareCode: string } }
) {
  const { data, status } = await callWorker(
    `/public-decks/share/${params.shareCode}`
  );
  return NextResponse.json(data, { status });
}