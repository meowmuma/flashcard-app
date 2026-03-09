// src/app/api/decks/route.ts - เพิ่ม GET method
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../lib/db';
import jwt from 'jsonwebtoken';

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ฟังก์ชันตรวจสอบ token และดึง userId
async function getUserIdFromToken(request: NextRequest): Promise<number | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined');
  }

  try {
    const decoded: any = jwt.verify(token, jwtSecret);
    return decoded.userId;
  } catch (err) {
    return null;
  }
}

// GET - ดึงชุดการ์ดทั้งหมดของผู้ใช้
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('📚 GET Decks: Fetching user decks...');

  let client;

  try {
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      console.log('❌ GET Decks: Unauthorized');
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token การยืนยันตัวตน' },
        { status: 401 }
      );
    }

    console.log('🔌 GET Decks: Connecting to database...');
    client = await pool.connect();

    // ดึงชุดการ์ดพร้อมนับจำนวนการ์ด
    const result = await client.query(
      `SELECT 
        d.*,
        COUNT(c.id) as card_count
      FROM decks d
      LEFT JOIN cards c ON d.id = c.deck_id
      WHERE d.user_id = $1
      GROUP BY d.id
      ORDER BY d.updated_at DESC`,
      [userId]
    );

    console.log(`✅ GET Decks: Found ${result.rows.length} decks`);

    return NextResponse.json({
      success: true,
      decks: result.rows,
    });

  } catch (error: any) {
    console.error('❌ GET Decks error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถดึงข้อมูลชุดการ์ดได้',
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

// POST - สร้างชุดการ์ดใหม่
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('📝 POST Deck: Creating new deck...');

  let client;

  try {
    const userId = await getUserIdFromToken(request);

    if (!userId) {
      console.log('❌ POST Deck: Unauthorized');
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token การยืนยันตัวตน' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('📦 POST Deck: Received data:', {
      title: body.title,
      userId: userId,
      isPublic: body.is_public,
    });

    const { title, description, category, is_public } = body;

    // ตรวจสอบข้อมูล
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      console.log('❌ POST Deck: Invalid title');
      return NextResponse.json(
        { success: false, error: 'กรุณาใส่ชื่อชุดการ์ด' },
        { status: 400 }
      );
    }

    if (is_public) {
      if (!description || description.trim().length === 0) {
        console.log('❌ POST Deck: Public deck requires description');
        return NextResponse.json(
          { success: false, error: 'กรุณาใส่คำอธิบายสำหรับชุดการ์ดสาธารณะ' },
          { status: 400 }
        );
      }
      if (!category || category.trim().length === 0) {
        console.log('❌ POST Deck: Public deck requires category');
        return NextResponse.json(
          { success: false, error: 'กรุณาเลือกภาษาสำหรับชุดการ์ดสาธารณะ' },
          { status: 400 }
        );
      }
    }

    const shareCode = is_public ? generateShareCode() : null;

    console.log('🔌 POST Deck: Connecting to database...');
    client = await pool.connect();

    // ตรวจสอบว่า user มีอยู่จริง
    console.log('🔍 POST Deck: Verifying user exists...');
    const userCheck = await client.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      console.log('❌ POST Deck: User not found in database');
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่พบข้อมูลผู้ใช้ กรุณาลงทะเบียนใหม่',
          details: `User ID ${userId} does not exist in users table`
        },
        { status: 400 }
      );
    }

    console.log('✅ POST Deck: User verified');

    // สร้างชุดการ์ด
    console.log('💾 POST Deck: Inserting deck...');
    const result = await client.query(
      `INSERT INTO decks (user_id, title, description, category, is_public, share_code) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, title.trim(), description?.trim() || null, category?.trim() || null, is_public || false, shareCode]
    );

    const deck = result.rows[0];
    console.log(`✅ POST Deck: Created successfully with ID: ${deck.id}`);

    // ตรวจสอบว่ามีการส่งการ์ดมาด้วยหรือไม่
    const cards = body.cards || [];

    if (Array.isArray(cards) && cards.length > 0) {
      console.log(`📝 POST Deck: Inserting ${cards.length} cards...`);

      // วนลูปบันทึกการ์ดทีละใบ
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];

        // ตรวจสอบว่าการ์ดมีข้อมูลครบถ้วน
        if (card.term && card.definition && 
            card.term.trim().length > 0 && 
            card.definition.trim().length > 0) {
          
          await client.query(
            `INSERT INTO cards (deck_id, term, definition, position) 
             VALUES ($1, $2, $3, $4)`,
            [deck.id, card.term.trim(), card.definition.trim(), i]
          );

          console.log(`  ✅ Card ${i + 1}: "${card.term}" inserted`);
        } else {
          console.log(`  ⚠️ Card ${i + 1}: Skipped (incomplete data)`);
        }
      }

      console.log(`✅ POST Deck: All cards inserted successfully`);
    }

    // ดึงข้อมูล deck พร้อมจำนวนการ์ดที่เพิ่งสร้าง
    const deckWithCards = await client.query(
      `SELECT 
        d.*,
        COUNT(c.id) as card_count
      FROM decks d
      LEFT JOIN cards c ON d.id = c.deck_id
      WHERE d.id = $1
      GROUP BY d.id`,
      [deck.id]
    );

    return NextResponse.json({
      success: true,
      deck: deckWithCards.rows[0],
      message: 'สร้างชุดการ์ดสำเร็จ',
    });

  } catch (error: any) {
    console.error('❌ POST Deck error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถสร้างชุดการ์ดได้',
        details: error.detail || error.message,
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
      console.log('🔌 POST Deck: Database connection released');
    }
  }
}