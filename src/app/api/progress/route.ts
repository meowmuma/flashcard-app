// src/app/api/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../lib/db';
import { 
  ProgressResponse, 
  DeckProgress, 
  StudySession,
  CardResult 
} from '../../types';

interface JWTPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

interface SaveProgressRequestBody {
  deckId: number;
  results: CardResult[];
}

// Interface สำหรับผลลัพธ์ที่ได้จาก database query
// เราต้องกำหนดเพราะ PostgreSQL จะส่งข้อมูลกลับมาในรูปแบบนี้
interface DeckProgressRow {
  deck_id: number;
  title: string;
  total_cards: string; // PostgreSQL COUNT คืนค่าเป็น string
  known_cards: string;
  unknown_cards: string;
  last_studied: Date | null;
}

interface StudySessionRow {
  id: number;
  user_id: number;
  deck_id: number;
  deck_title: string;
  known_count: number;
  unknown_count: number;
  completed_at: Date;
}

function getUserIdFromToken(request: NextRequest): number | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JWTPayload;
    
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

// GET - ดึงข้อมูลความคืบหน้าทั้งหมดของผู้ใช้
// API นี้จะดึงสถิติของทุกชุดคำศัพท์ พร้อมประวัติการเรียนล่าสุด
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // Query ที่ซับซ้อนนี้จะคำนวณสถิติของแต่ละชุด
    // เราใช้ COALESCE เพื่อแปลง NULL เป็น 0
    // และใช้ COUNT DISTINCT เพื่อนับการ์ดที่ไม่ซ้ำกัน
    const progressQuery = `
      SELECT 
        d.id as deck_id,
        d.title,
        COUNT(DISTINCT c.id)::text as total_cards,
        COUNT(DISTINCT CASE WHEN cp.is_known = true THEN c.id END)::text as known_cards,
        COUNT(DISTINCT CASE WHEN cp.is_known = false OR cp.is_known IS NULL THEN c.id END)::text as unknown_cards,
        MAX(ss.completed_at) as last_studied
      FROM decks d
      LEFT JOIN cards c ON d.id = c.deck_id
      LEFT JOIN card_progress cp ON c.id = cp.card_id AND cp.user_id = $1
      LEFT JOIN study_sessions ss ON d.id = ss.deck_id AND ss.user_id = $1
      WHERE d.user_id = $1
      GROUP BY d.id, d.title
      ORDER BY d.updated_at DESC
    `;

    const progressResult = await pool.query<DeckProgressRow>(progressQuery, [userId]);

    // แปลง string จาก database เป็น number
    // PostgreSQL COUNT คืนค่าเป็น string แต่เราต้องการ number ใน TypeScript
    const deckProgress: DeckProgress[] = progressResult.rows.map(row => ({
      deck_id: row.deck_id,
      title: row.title,
      total_cards: parseInt(row.total_cards, 10),
      known_cards: parseInt(row.known_cards, 10),
      unknown_cards: parseInt(row.unknown_cards, 10),
      last_studied: row.last_studied?.toISOString(),
    }));

    // ดึงประวัติการเรียน 10 ครั้งล่าสุด
    const sessionsResult = await pool.query<StudySessionRow>(
      `SELECT 
        ss.id,
        ss.user_id,
        ss.deck_id,
        d.title as deck_title,
        ss.known_count,
        ss.unknown_count,
        ss.completed_at
       FROM study_sessions ss
       JOIN decks d ON ss.deck_id = d.id
       WHERE ss.user_id = $1
       ORDER BY ss.completed_at DESC
       LIMIT 10`,
      [userId]
    );

    const recentSessions: StudySession[] = sessionsResult.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      deck_id: row.deck_id,
      deck_title: row.deck_title,
      known_count: row.known_count,
      unknown_count: row.unknown_count,
      completed_at: row.completed_at.toISOString(),
    }));

    // คำนวณสถิติรวม
    const totalCards = deckProgress.reduce((sum, deck) => sum + deck.total_cards, 0);
    const knownCards = deckProgress.reduce((sum, deck) => sum + deck.known_cards, 0);
    const unknownCards = deckProgress.reduce((sum, deck) => sum + deck.unknown_cards, 0);

    const response: ProgressResponse = {
      deckProgress,
      recentSessions,
      totalCards,
      knownCards,
      unknownCards,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

// POST - บันทึกผลการเรียน
// เมื่อผู้ใช้เรียนจบ frontend จะส่งผลการตอบทุกการ์ดมา
// เราจะบันทึกลง database เพื่อติดตามความคืบหน้า
export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const userId = getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const body: SaveProgressRequestBody = await request.json();
    const { deckId, results } = body;

    if (!deckId || !results || results.length === 0) {
      return NextResponse.json(
        { error: 'กรุณาส่งข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าชุดนี้เป็นของผู้ใช้จริง
    const deckCheck = await client.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [deckId, userId]
    );

    if (deckCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบชุดคำศัพท์นี้' },
        { status: 404 }
      );
    }

    await client.query('BEGIN');

    // บันทึกผลการเรียนแต่ละการ์ด
    // เราใช้ UPSERT (INSERT ... ON CONFLICT UPDATE) 
    // เพื่ออัปเดตถ้ามีอยู่แล้ว หรือสร้างใหม่ถ้ายังไม่มี
    for (const result of results) {
      await client.query(
        `INSERT INTO card_progress (user_id, card_id, is_known)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, card_id) 
         DO UPDATE SET is_known = $3, updated_at = CURRENT_TIMESTAMP`,
        [userId, result.cardId, result.isKnown]
      );
    }

    // นับจำนวนการ์ดที่รู้และไม่รู้
    const knownCount: number = results.filter(r => r.isKnown).length;
    const unknownCount: number = results.filter(r => !r.isKnown).length;

    // บันทึก study session
    // นี่คือประวัติการเรียนครั้งนี้ที่จะแสดงในหน้า My Progress
    await client.query(
      `INSERT INTO study_sessions (user_id, deck_id, known_count, unknown_count)
       VALUES ($1, $2, $3, $4)`,
      [userId, deckId, knownCount, unknownCount]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { 
        message: 'บันทึกความคืบหน้าสำเร็จ',
        knownCount,
        unknownCount 
      },
      { status: 200 }
    );

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Save progress error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึก' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}