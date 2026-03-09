// src/app/api/all-progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../lib/db';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token' },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const client = await pool.connect();

    try {
      // ดึงข้อมูลความคืบหน้าที่ยังไม่เสร็จ (กำลังเรียน/กำลังเล่น)
      const progressResult = await client.query(
        `SELECT
          sp.id, 
          sp.deck_id,
          d.title AS deck_title,
          sp.session_type, 
          sp.total_cards, 
          sp.known_cards, 
          sp.unknown_cards,
          sp.current_card_index,
          NULL::numeric AS accuracy_percentage,
          NULL::numeric AS time_spent_seconds,
          NULL::text AS completed_at,
          NULL::numeric AS best_time_seconds,
          to_char(sp.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
          'progress' AS data_type
        FROM study_progress sp
        INNER JOIN decks d ON sp.deck_id = d.id
        WHERE sp.user_id = $1
        ORDER BY sp.updated_at DESC`,
        [userId]
      );

      // ดึงข้อมูลประวัติที่เสร็จสมบูรณ์แล้ว
      // สำหรับเกม Match จะดึงเวลาล่าสุดจาก game_best_times.last_time_seconds
      // และดึงสถิติดีสุดจาก game_best_times.best_time_seconds
      const historyResult = await client.query(
        `SELECT
          sh.id, 
          sh.deck_id,
          d.title AS deck_title,
          sh.session_type, 
          sh.total_cards, 
          sh.known_cards, 
          sh.unknown_cards,
          NULL::integer AS current_card_index,
          sh.accuracy_percentage,
          -- สำหรับเกม Match ใช้เวลาล่าสุดจาก game_best_times
          -- สำหรับ Flashcard ใช้เวลาจาก study_history
          CASE
            WHEN sh.session_type = 'match' THEN CAST(gbt.last_time_seconds AS FLOAT)
            ELSE CAST(sh.time_spent_seconds AS FLOAT)
          END AS time_spent_seconds,
          to_char(sh.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS completed_at,
          to_char(sh.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
          -- ดึงสถิติเวลาดีสุดสำหรับเกม Match
          CAST(gbt.best_time_seconds AS FLOAT) AS best_time_seconds,
          gbt.attempts_count,
          'history' AS data_type
        FROM study_history sh
        INNER JOIN decks d ON sh.deck_id = d.id
        -- LEFT JOIN เพื่อดึงข้อมูลจาก game_best_times สำหรับเกม Match เท่านั้น
        LEFT JOIN game_best_times gbt
          ON gbt.user_id = sh.user_id
          AND gbt.deck_id = sh.deck_id
          AND gbt.game_type = 'matching'
          AND sh.session_type = 'match'
        WHERE sh.user_id = $1
          -- เลือกเฉพาะ record ล่าสุดของแต่ละชุดการ์ดและประเภทเกม
          AND sh.id = (
            SELECT id 
            FROM study_history sh2
            WHERE sh2.user_id = sh.user_id
              AND sh2.deck_id = sh.deck_id
              AND sh2.session_type = sh.session_type
            ORDER BY sh2.completed_at DESC
            LIMIT 1
          )
        ORDER BY sh.completed_at DESC`,
        [userId]
      );

      // รวมข้อมูลทั้งสองส่วนเข้าด้วยกัน
      const allData = [
        ...progressResult.rows,
        ...historyResult.rows,
      ].sort((a, b) => {
        // เรียงลำดับตามเวลาล่าสุด (completed_at สำหรับที่เสร็จแล้ว, updated_at สำหรับที่กำลังทำ)
        const timeA = new Date(a.completed_at || a.updated_at).getTime();
        const timeB = new Date(b.completed_at || b.updated_at).getTime();
        return timeB - timeA;
      });

      console.log(`✅ Fetched ${allData.length} progress records for user ${userId}`);

      return NextResponse.json({
        success: true,
        data: allData
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ all-progress error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาด',
        details: error.message
      },
      { status: 500 }
    );
  }
}