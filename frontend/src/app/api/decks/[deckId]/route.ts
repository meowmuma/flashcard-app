// src/app/api/decks/[deckId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import jwt from 'jsonwebtoken';

export async function GET(
  request: NextRequest,
  { params }: { params: { deckId: string } }
): Promise<NextResponse> {
  const deckId = parseInt(params.deckId);
  console.log(`📖 Fetching deck ${deckId}...`);

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token การยืนยันตัวตน' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    const userId = decoded.userId;

    const client = await pool.connect();

    try {
      // ดึงข้อมูลชุดการ์ด - เปลี่ยนเงื่อนไขให้รองรับชุดสาธารณะด้วย
      const deckResult = await client.query(
        `SELECT d.*, u.email as author_email 
         FROM decks d 
         INNER JOIN users u ON d.user_id = u.id 
         WHERE d.id = $1 AND (d.user_id = $2 OR d.is_public = TRUE)`,
        [deckId, userId]
      );

      if (deckResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบชุดการ์ดนี้หรือคุณไม่มีสิทธิ์เข้าถึง' },
          { status: 404 }
        );
      }

      const deck = deckResult.rows[0];

      // ดึงการ์ดทั้งหมดในชุด - ไม่ต้องเช็คเจ้าของเพราะเช็คไปแล้วข้างบน
      const cardsResult = await client.query(
        'SELECT * FROM cards WHERE deck_id = $1 ORDER BY id',
        [deckId]
      );

      console.log(`✅ Deck loaded: ${deck.title} with ${cardsResult.rows.length} cards`);

      return NextResponse.json({
        success: true,
        deck: deck,
        cards: cardsResult.rows,
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error fetching deck:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { deckId: string } }
): Promise<NextResponse> {
  const deckId = parseInt(params.deckId);
  console.log(`🗑️ Deleting deck ${deckId}...`);

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token การยืนยันตัวตน' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    const userId = decoded.userId;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // ตรวจสอบว่าเป็นเจ้าของชุดหรือไม่
      const deckResult = await client.query(
        'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
        [deckId, userId]
      );

      if (deckResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'ไม่พบชุดการ์ดนี้หรือคุณไม่มีสิทธิ์ลบ' },
          { status: 404 }
        );
      }

      // ลบการ์ดทั้งหมดในชุดก่อน
      await client.query('DELETE FROM cards WHERE deck_id = $1', [deckId]);

      // ลบความคืบหน้าการเรียนที่เกี่ยวข้อง
      await client.query('DELETE FROM study_progress WHERE deck_id = $1', [deckId]);

      // ลบสถิติเกมที่เกี่ยวข้อง
      await client.query('DELETE FROM game_best_times WHERE deck_id = $1', [deckId]);

      // ลบชุดการ์ด
      await client.query('DELETE FROM decks WHERE id = $1', [deckId]);

      await client.query('COMMIT');

      console.log(`✅ Deck ${deckId} deleted successfully`);

      return NextResponse.json({
        success: true,
        message: 'ลบชุดการ์ดสำเร็จ',
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error deleting deck:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถลบชุดการ์ดได้',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { deckId: string } }
): Promise<NextResponse> {
  console.log('✏️ Updating deck...');

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token การยืนยันตัวตน' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    const userId = decoded.userId;

    const deckId = parseInt(params.deckId);
    const body = await request.json();
    const { title, description, category, is_public } = body;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาใส่ชื่อชุดการ์ด' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // ตรวจสอบว่าผู้ใช้เป็นเจ้าของชุดการ์ดนี้หรือไม่
      const checkOwnership = await client.query(
        'SELECT user_id FROM decks WHERE id = $1',
        [deckId]
      );

      if (checkOwnership.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบชุดการ์ดนี้' },
          { status: 404 }
        );
      }

      if (checkOwnership.rows[0].user_id !== userId) {
        return NextResponse.json(
          { success: false, error: 'คุณไม่มีสิทธิ์แก้ไขชุดการ์ดนี้' },
          { status: 403 }
        );
      }

      // อัพเดตข้อมูลชุดการ์ด
      const result = await client.query(
        `UPDATE decks 
         SET title = $1, description = $2, category = $3, is_public = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
        [title.trim(), description || null, category || null, is_public, deckId, userId]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'ไม่สามารถอัพเดตชุดการ์ดได้' },
          { status: 500 }
        );
      }

      console.log(`✅ Deck updated: ${title}`);

      return NextResponse.json({
        success: true,
        deck: result.rows[0],
        message: 'อัพเดตชุดการ์ดสำเร็จ',
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error updating deck:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถอัพเดตชุดการ์ดได้',
        details: error.message,
      },
      { status: 500 }
    );
  }
}