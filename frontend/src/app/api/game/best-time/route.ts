// src/app/api/game/best-time/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import jwt from 'jsonwebtoken';

// ฟังก์ชันช่วยสำหรับดึง userId จาก JWT token
function getUserId(request: NextRequest): number | null {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;
    
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined');
      return null;
    }
    
    const decoded = jwt.verify(token, jwtSecret) as { userId: number };
    return decoded.userId;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

// GET: ดึงสถิติเวลาดีสุดและเวลาล่าสุด
export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = request.nextUrl;
  const deck_id = searchParams.get('deck_id');
  const game_type = searchParams.get('game_type') || 'matching';

  if (!deck_id) {
    return NextResponse.json(
      { success: false, error: 'ไม่พบ deck_id' },
      { status: 400 }
    );
  }

  const client = await pool.connect();
  try {
    // ดึงข้อมูลสถิติจากฐานข้อมูล
    // ใช้ CAST เป็น FLOAT เพื่อให้แน่ใจว่าได้ค่าทศนิยมกลับมา
    const result = await client.query(
      `SELECT
        CAST(best_time_seconds AS FLOAT) AS best_time_seconds,
        CAST(last_time_seconds AS FLOAT) AS last_time_seconds,
        attempts_count,
        achieved_at,
        last_played_at
       FROM game_best_times
       WHERE user_id = $1 AND deck_id = $2 AND game_type = $3`,
      [userId, parseInt(deck_id), game_type]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        best_time: null
      });
    }

    return NextResponse.json({
      success: true,
      best_time: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching best time:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาด', details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// POST: บันทึกเวลาใหม่และอัพเดตสถิติ
export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { deck_id, game_type = 'matching', time_seconds } = body;

  // ตรวจสอบความถูกต้องของข้อมูล
  if (!deck_id || time_seconds == null || time_seconds <= 0) {
    return NextResponse.json(
      { success: false, error: 'ข้อมูลไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  // ปัดเศษเวลาเป็น 1 ตำแหน่งทศนิยม เช่น 9.624 → 9.6
  const roundedTime = Math.round(parseFloat(time_seconds) * 10) / 10;
  
  console.log(`💾 Saving game time: ${roundedTime}s for deck ${deck_id}`);

  const client = await pool.connect();
  try {
    // ตรวจสอบว่ามีสถิติเก่าอยู่แล้วหรือไม่
    const existing = await client.query(
      `SELECT 
        CAST(best_time_seconds AS FLOAT) AS best_time_seconds,
        attempts_count
       FROM game_best_times 
       WHERE user_id = $1 AND deck_id = $2 AND game_type = $3`,
      [userId, deck_id, game_type]
    );

    let is_new_best = false;
    let new_best_time: number;
    let new_attempts_count = 1;

    if (existing.rows.length > 0) {
      // มีสถิติเก่าอยู่แล้ว - เปรียบเทียบกับเวลาใหม่
      const oldBest = parseFloat(String(existing.rows[0].best_time_seconds));
      const oldAttempts = existing.rows[0].attempts_count || 0;
      
      // ถ้าเวลาใหม่เร็วกว่าเวลาเก่า ถือว่าเป็นสถิติใหม่
      is_new_best = roundedTime < oldBest;
      new_best_time = is_new_best ? roundedTime : oldBest;
      new_attempts_count = oldAttempts + 1;

      console.log(`📊 Old best: ${oldBest}s, New time: ${roundedTime}s, Is new best: ${is_new_best}`);

      // อัพเดตข้อมูลในฐานข้อมูล
      if (is_new_best) {
        // ถ้าเป็นสถิติใหม่ ให้อัพเดตทั้ง best_time และ last_time
        await client.query(
          `UPDATE game_best_times
           SET best_time_seconds = $1,
               last_time_seconds = $1,
               attempts_count = $2,
               achieved_at = CURRENT_TIMESTAMP,
               last_played_at = CURRENT_TIMESTAMP
           WHERE user_id = $3 AND deck_id = $4 AND game_type = $5`,
          [roundedTime, new_attempts_count, userId, deck_id, game_type]
        );
        console.log(`✅ Updated best time to ${roundedTime}s`);
      } else {
        // ถ้าไม่ใช่สถิติใหม่ ให้อัพเดตเฉพาะ last_time และ attempts
        await client.query(
          `UPDATE game_best_times
           SET last_time_seconds = $1,
               attempts_count = $2,
               last_played_at = CURRENT_TIMESTAMP
           WHERE user_id = $3 AND deck_id = $4 AND game_type = $5`,
          [roundedTime, new_attempts_count, userId, deck_id, game_type]
        );
        console.log(`✅ Updated last time to ${roundedTime}s (not a new best)`);
      }
    } else {
      // ยังไม่มีสถิติเลย - สร้างใหม่
      is_new_best = true;
      new_best_time = roundedTime;

      await client.query(
        `INSERT INTO game_best_times
         (user_id, deck_id, game_type, best_time_seconds, last_time_seconds, attempts_count, achieved_at, last_played_at)
         VALUES ($1, $2, $3, $4, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [userId, deck_id, game_type, roundedTime]
      );
      console.log(`✅ Created new best time record: ${roundedTime}s`);
    }

    // ส่งข้อมูลกลับไปยัง client
    return NextResponse.json({
      success: true,
      is_new_best,
      best_time_seconds: new_best_time,
      last_time_seconds: roundedTime,
      attempts_count: new_attempts_count,
    });

  } catch (error: any) {
    console.error('❌ Error saving game time:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถบันทึกเวลาได้',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}