// src/app/api/public-decks/[deckId]/copy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import jwt from 'jsonwebtoken';

export async function POST(
  request: NextRequest,
  { params }: { params: { deckId: string } }
): Promise<NextResponse> {
  const deckId = parseInt(params.deckId);
  console.log(`📋 Copying public deck ${deckId}...`);

  try {
    // ตรวจสอบว่าผู้ใช้ล็อกอินหรือยัง
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'กรุณาเข้าสู่ระบบก่อนคัดลอกชุดการ์ด' },
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
      // เริ่ม transaction เพื่อให้แน่ใจว่าข้อมูลจะถูกบันทึกพร้อมกันทั้งหมด
      // ถ้ามีขั้นตอนใดผิดพลาด ข้อมูลทั้งหมดจะถูกยกเลิก
      await client.query('BEGIN');

      // ดึงข้อมูลชุดการ์ดต้นฉบับ
      const deckQuery = `
        SELECT d.*, u.id as original_author_id
        FROM decks d
        LEFT JOIN users u ON d.user_id = u.id
        WHERE d.id = $1 AND d.is_public = TRUE
      `;
      const deckResult = await client.query(deckQuery, [deckId]);

      if (deckResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'ไม่พบชุดการ์ดสาธารณะนี้' },
          { status: 404 }
        );
      }

      const originalDeck = deckResult.rows[0];

      // ตรวจสอบว่าผู้ใช้เคยคัดลอกชุดนี้ไปแล้วหรือยัง
      const existingCopyQuery = `
        SELECT id FROM decks
        WHERE user_id = $1 AND original_deck_id = $2
        LIMIT 1
      `;
      const existingCopy = await client.query(existingCopyQuery, [userId, deckId]);

      if (existingCopy.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { 
            error: 'คุณเคยคัดลอกชุดการ์ดนี้ไปแล้ว',
            existing_deck_id: existingCopy.rows[0].id 
          },
          { status: 400 }
        );
      }

      // สร้างชุดการ์ดใหม่สำหรับผู้ใช้
      const newDeckQuery = `
        INSERT INTO decks (
          user_id, 
          title, 
          description, 
          category,
          is_public,
          original_deck_id,
          original_author_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, FALSE, $5, $6, NOW(), NOW())
        RETURNING id, title
      `;

      const newDeckResult = await client.query(newDeckQuery, [
        userId,
        originalDeck.title, // ใช้ชื่อเดิม ไม่เพิ่มคำว่า (คัดลอก) เพราะอยู่ใน My Decks อยู่แล้ว
        originalDeck.description,
        originalDeck.category,
        deckId,
        originalDeck.original_author_id || originalDeck.user_id, // เก็บผู้สร้างต้นฉบับจริงๆ
      ]);

      const newDeck = newDeckResult.rows[0];
      console.log(`✅ Created new deck ${newDeck.id} for user ${userId}`);

      // คัดลอกการ์ดทั้งหมดจากชุดต้นฉบับ
      const cardsQuery = 'SELECT term, definition FROM cards WHERE deck_id = $1 ORDER BY created_at ASC';
      const cardsResult = await client.query(cardsQuery, [deckId]);

      if (cardsResult.rows.length > 0) {
        // สร้าง query สำหรับ insert การ์ดหลายใบพร้อมกัน (bulk insert)
        // วิธีนี้เร็วกว่าการ insert ทีละใบมาก
        const cardValues = cardsResult.rows.map(
          (_: any, index: number) => 
            `($1, $${index * 2 + 2}, $${index * 2 + 3}, NOW())`
        ).join(', ');

        const cardParams = [newDeck.id];
        cardsResult.rows.forEach((card: any) => {
          cardParams.push(card.term, card.definition);
        });

        const insertCardsQuery = `
          INSERT INTO cards (deck_id, term, definition, created_at)
          VALUES ${cardValues}
        `;

        await client.query(insertCardsQuery, cardParams);
        console.log(`✅ Copied ${cardsResult.rows.length} cards`);
      }

      // เพิ่มจำนวนครั้งที่ถูกคัดลอกของชุดต้นฉบับ
      await client.query(
        'UPDATE decks SET times_copied = times_copied + 1 WHERE id = $1',
        [deckId]
      );

      // Commit transaction ให้บันทึกข้อมูลทั้งหมด
      await client.query('COMMIT');

      console.log('✅ Deck copied successfully');

      return NextResponse.json({
        success: true,
        message: 'คัดลอกชุดการ์ดสำเร็จ',
        deck: newDeck,
      });

    } catch (error) {
      // ถ้ามี error ให้ rollback transaction เพื่อไม่ให้มีข้อมูลไม่สมบูรณ์
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error copying deck:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถคัดลอกชุดการ์ดได้',
        details: error.message,
      },
      { status: 500 }
    );
  }
}