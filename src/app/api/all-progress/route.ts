// src/app/api/all-progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../lib/db';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'ไม่พบ token' }, { status: 401 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET is not defined');

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      return NextResponse.json({ success: false, error: 'Token ไม่ถูกต้อง' }, { status: 401 });
    }

    const userId = decoded.userId;
    const client = await pool.connect();

    try {
      // ── ดึง study_progress (กำลังเรียนอยู่) ──────────────────────────────
      const progressResult = await client.query(
        `SELECT
          sp.id,
          sp.deck_id,
          d.title                                        AS deck_title,
          sp.session_type,
          sp.total_cards,
          sp.known_cards,
          sp.unknown_cards,
          sp.current_card_index,
          NULL::numeric                                  AS accuracy_percentage,
          NULL::integer                                  AS time_spent_seconds,
          NULL::text                                     AS completed_at,
          -- ✅ FIX timezone: ส่งเป็น ISO string UTC ชัดเจน (มี Z ต่อท้าย)
          to_char(sp.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
          'progress'                                     AS data_type
        FROM study_progress sp
        INNER JOIN decks d ON sp.deck_id = d.id
        WHERE sp.user_id = $1
        ORDER BY sp.updated_at DESC`,
        [userId]
      );

      // ── ดึง study_history (เสร็จสิ้นแล้ว) — เอาแค่ล่าสุด 1 อันต่อ (deck+session_type) ──
      // ✅ FIX duplicate: ใช้ DISTINCT ON เพื่อเอาเฉพาะ row ล่าสุดของแต่ละ deck+session_type
      const historyResult = await client.query(
        `SELECT DISTINCT ON (sh.deck_id, sh.session_type)
          sh.id,
          sh.deck_id,
          d.title                                        AS deck_title,
          sh.session_type,
          sh.total_cards,
          sh.known_cards,
          sh.unknown_cards,
          NULL::integer                                  AS current_card_index,
          sh.accuracy_percentage,
          sh.time_spent_seconds,
          -- ✅ FIX timezone: ส่งเป็น ISO string UTC ชัดเจน (มี Z ต่อท้าย)
          to_char(sh.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS completed_at,
          to_char(sh.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
          'history'                                      AS data_type
        FROM study_history sh
        INNER JOIN decks d ON sh.deck_id = d.id
        WHERE sh.user_id = $1
        -- DISTINCT ON เลือก row แรกของแต่ละกลุ่ม ต้องเรียงให้ล่าสุดขึ้นก่อน
        ORDER BY sh.deck_id, sh.session_type, sh.completed_at DESC`,
        [userId]
      );

      // รวม progress + history แล้วเรียงตามเวลาล่าสุด
      const allData = [
        ...progressResult.rows,
        ...historyResult.rows,
      ].sort((a, b) => {
        const timeA = new Date(a.completed_at || a.updated_at).getTime();
        const timeB = new Date(b.completed_at || b.updated_at).getTime();
        return timeB - timeA;
      });

      return NextResponse.json({ success: true, data: allData });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ all-progress error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาด', details: error.message },
      { status: 500 }
    );
  }
}