// src/app/api/decks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../lib/db';
import { Deck, Card, DecksResponse } from '../../types';

// Interface สำหรับ JWT payload
interface JWTPayload {
  userId: number;
  email: string;
  iat: number;
  exp: number;
}

// Interface สำหรับ request body ของการสร้าง/แก้ไข deck
interface CreateDeckRequestBody {
  title: string;
  cards: Omit<Card, 'id' | 'deck_id' | 'created_at'>[]; // cards ที่ไม่มี id deck_id และ created_at
}

// ฟังก์ชันช่วยในการดึง userId จาก token
// เราแยกออกมาเป็นฟังก์ชันเพราะจะใช้ซ้ำในหลาย API
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

// GET - ดึงชุดคำศัพท์ทั้งหมดของผู้ใช้
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    // ดึงข้อมูลชุดคำศัพท์พร้อมนับจำนวนการ์ด
    // เราใช้ LEFT JOIN เพื่อให้ได้ชุดที่ไม่มีการ์ดด้วย
    const result = await pool.query<Deck>(
      `SELECT 
        d.id, 
        d.user_id, 
        d.title, 
        d.created_at, 
        d.updated_at,
        COUNT(c.id)::int as card_count
       FROM decks d
       LEFT JOIN cards c ON d.id = c.deck_id
       WHERE d.user_id = $1
       GROUP BY d.id
       ORDER BY d.updated_at DESC`,
      [userId]
    );

    const response: DecksResponse = {
      decks: result.rows,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get decks error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

// POST - สร้างชุดคำศัพท์ใหม่
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

    const body: CreateDeckRequestBody = await request.json();
    const { title, cards } = body;

    // Validation
    if (!title || !cards || cards.length === 0) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // เริ่ม transaction เพื่อให้มั่นใจว่าข้อมูลจะถูกบันทึกพร้อมกันหรือไม่บันทึกเลย
    await client.query('BEGIN');

    // สร้างชุดคำศัพท์
    const deckResult = await client.query<Deck>(
      'INSERT INTO decks (user_id, title) VALUES ($1, $2) RETURNING *',
      [userId, title]
    );

    const newDeck: Deck = deckResult.rows[0];

    // สร้างการ์ดทั้งหมด
    for (const card of cards) {
      await client.query(
        'INSERT INTO cards (deck_id, term, definition) VALUES ($1, $2, $3)',
        [newDeck.id, card.term, card.definition]
      );
    }

    // Commit transaction
    await client.query('COMMIT');

    return NextResponse.json(
      { 
        message: 'สร้างชุดคำศัพท์สำเร็จ',
        deck: newDeck 
      },
      { status: 201 }
    );

  } catch (error) {
    // ถ้ามีข้อผิดพลาด rollback transaction
    await client.query('ROLLBACK');
    console.error('Create deck error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างชุดคำศัพท์' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}