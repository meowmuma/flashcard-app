// src/app/api/public-decks/share/[shareCode]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { shareCode: string } }
): Promise<NextResponse> {
  const shareCode = params.shareCode.toUpperCase(); // แปลงเป็นตัวพิมพ์ใหญ่ทั้งหมด
  console.log(`🔗 Getting deck by share code: ${shareCode}`);

  try {
    const client = await pool.connect();

    try {
      // ดึงข้อมูลชุดการ์ดจาก share code
      const deckQuery = `
        SELECT 
          d.id,
          d.title,
          d.description,
          d.category,
          d.share_code,
          d.times_copied,
          d.created_at,
          d.is_public,
          u.email as author_email,
          COUNT(DISTINCT c.id)::integer as card_count
        FROM decks d
        LEFT JOIN cards c ON d.id = c.deck_id
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.share_code = $1 AND d.is_public = TRUE
        GROUP BY d.id, u.email
      `;

      const deckResult = await client.query(deckQuery, [shareCode]);

      if (deckResult.rows.length === 0) {
        console.log('❌ Deck not found with this share code');
        return NextResponse.json(
          { error: 'ไม่พบชุดการ์ดนี้ หรือชุดการ์ดนี้ไม่ได้เปิดเป็นสาธารณะ' },
          { status: 404 }
        );
      }

      const deck = deckResult.rows[0];

      // ดึงการ์ดทั้งหมดในชุด
      const cardsQuery = `
        SELECT id, term, definition, created_at
        FROM cards
        WHERE deck_id = $1
        ORDER BY created_at ASC
      `;

      const cardsResult = await client.query(cardsQuery, [deck.id]);

      console.log(`✅ Found deck ${deck.id} with ${cardsResult.rows.length} cards`);

      return NextResponse.json({
        success: true,
        deck: {
          ...deck,
          cards: cardsResult.rows,
        },
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error getting deck by share code:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถดึงข้อมูลชุดการ์ดได้',
        details: error.message,
      },
      { status: 500 }
    );
  }
}