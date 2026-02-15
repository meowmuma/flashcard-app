// src/app/api/decks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../../lib/db';
import { Deck, Card, DeckDetailResponse } from '../../../types';

interface JWTPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

interface UpdateDeckRequestBody {
  title: string;
  cards: Omit<Card, 'deck_id' | 'created_at'>[];
}

// Interface สำหรับ route context ที่ Next.js ส่งมาให้
// มันจะบอกเราว่า dynamic parameter คืออะไร
interface RouteContext {
  params: {
    id: string;
  };
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

// GET - ดึงข้อมูลชุดคำศัพท์พร้อมการ์ดทั้งหมด
// เราใช้ context parameter เพื่อเข้าถึง dynamic route parameter [id]
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const userId = getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // แปลง id จาก string เป็น number
    // การแปลงนี้สำคัญเพราะ URL parameters เป็น string เสมอ
    const deckId: number = parseInt(context.params.id, 10);

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // ดึงข้อมูลชุดคำศัพท์
    // เราตรวจสอบว่าเป็นของผู้ใช้คนนี้จริงๆ ด้วยเพื่อความปลอดภัย
    const deckResult = await pool.query<Deck>(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [deckId, userId]
    );

    if (deckResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบชุดคำศัพท์นี้' },
        { status: 404 }
      );
    }

    const deck: Deck = deckResult.rows[0];

    // ดึงการ์ดทั้งหมดในชุดนี้
    const cardsResult = await pool.query<Card>(
      'SELECT * FROM cards WHERE deck_id = $1 ORDER BY id',
      [deckId]
    );

    const response: DeckDetailResponse = {
      deck,
      cards: cardsResult.rows,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get deck error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขชุดคำศัพท์
// การแก้ไขจะลบการ์ดเดิมทิ้งแล้วสร้างใหม่ตาม request
// วิธีนี้ง่ายกว่าการเปรียบเทียบว่าการ์ดไหนเปลี่ยน ไหนเหมือนเดิม
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const client = await pool.connect();

  try {
    const userId = getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const deckId: number = parseInt(context.params.id, 10);

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const body: UpdateDeckRequestBody = await request.json();
    const { title, cards } = body;

    if (!title || !cards || cards.length === 0) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าชุดนี้เป็นของผู้ใช้จริงหรือไม่
    const deckCheck = await client.query(
      'SELECT id FROM decks WHERE id = $1 AND user_id = $2',
      [deckId, userId]
    );

    if (deckCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบชุดคำศัพท์นี้หรือคุณไม่มีสิทธิ์แก้ไข' },
        { status: 404 }
      );
    }

    // เริ่ม transaction
    await client.query('BEGIN');

    // อัปเดตชื่อชุด
    await client.query(
      'UPDATE decks SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [title, deckId]
    );

    // ลบการ์ดเดิมทั้งหมด
    await client.query('DELETE FROM cards WHERE deck_id = $1', [deckId]);

    // เพิ่มการ์ดใหม่ทั้งหมด
    for (const card of cards) {
      await client.query(
        'INSERT INTO cards (deck_id, term, definition) VALUES ($1, $2, $3)',
        [deckId, card.term, card.definition]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json(
      { message: 'แก้ไขชุดคำศัพท์สำเร็จ' },
      { status: 200 }
    );

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update deck error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไข' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE - ลบชุดคำศัพท์
// เมื่อลบชุด การ์ดทั้งหมดในชุดจะถูกลบตามด้วยเพราะเรามี ON DELETE CASCADE
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const userId = getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const deckId: number = parseInt(context.params.id, 10);

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // ลบชุด โดยตรวจสอบว่าเป็นของผู้ใช้ด้วย
    const result = await pool.query(
      'DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id',
      [deckId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบชุดคำศัพท์นี้หรือคุณไม่มีสิทธิ์ลบ' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'ลบชุดคำศัพท์สำเร็จ' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Delete deck error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบ' },
      { status: 500 }
    );
  }
}