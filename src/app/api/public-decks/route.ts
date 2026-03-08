// src/app/api/public-decks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../lib/db';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('📚 Fetching all decks (public + user)...');

  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    let userId: number | null = null;
    
    // ถ้ามี token ให้ดึง userId ออกมา เพื่อระบุว่าชุดไหนเป็นของผู้ใช้
    if (token) {
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('JWT_SECRET is not defined');
        }
        const decoded = jwt.verify(token, jwtSecret) as { userId: number };
        userId = decoded.userId;
      } catch (err) {
        // ถ้า token ไม่ valid ก็ไม่เป็นไร ให้แสดงแค่ชุดสาธารณะ
        console.log('Invalid token, showing public decks only');
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const sort = searchParams.get('sort') || 'newest';

    const client = await pool.connect();

    try {
      let orderBy = 'd.created_at DESC';
      
      if (sort === 'popular') {
        orderBy = 'd.times_copied DESC, d.created_at DESC';
      }

      // ดึงชุดสาธารณะทั้งหมด และถ้ามี userId ให้ระบุว่าชุดไหนเป็นของผู้ใช้
      const query = `
        SELECT 
          d.id,
          d.title,
          d.description,
          d.category,
          d.is_public,
          d.share_code,
          d.times_copied,
          d.created_at,
          u.email as author_email,
          COUNT(c.id)::integer as card_count,
          ${userId ? `CASE WHEN d.user_id = $1 THEN true ELSE false END as is_owner` : 'false as is_owner'}
        FROM decks d
        INNER JOIN users u ON d.user_id = u.id
        LEFT JOIN cards c ON d.id = c.deck_id
        WHERE d.is_public = TRUE
        GROUP BY d.id, u.email
        ORDER BY ${orderBy}
      `;

      const result = userId 
        ? await client.query(query, [userId])
        : await client.query(query);

      console.log(`✅ Found ${result.rows.length} public decks`);

      return NextResponse.json({
        success: true,
        decks: result.rows,
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error fetching public decks:', error);
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