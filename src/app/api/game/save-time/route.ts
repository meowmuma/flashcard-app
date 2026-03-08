// src/app/api/game/save-time/route.ts - สร้างใหม่
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('⏱️ Saving game time...');

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

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const userId = decoded.userId;
    const body = await request.json();
    const { deck_id, time_seconds } = body;

    if (!deck_id || !time_seconds || time_seconds <= 0) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const client = await pool.connect();

    try {
      // ตรวจสอบว่ามีสถิติเก่าหรือไม่
      const existingRecord = await client.query(
        'SELECT best_time_seconds, attempts_count FROM game_best_times WHERE user_id = $1 AND deck_id = $2 AND game_type = $3',
        [userId, deck_id, 'match']
      );

      if (existingRecord.rows.length > 0) {
        const oldBestTime = existingRecord.rows[0].best_time_seconds;
        const oldAttempts = existingRecord.rows[0].attempts_count;

        // อัพเดตเฉพาะถ้าทำเวลาดีกว่าเก่า
        if (time_seconds < oldBestTime) {
          await client.query(
            'UPDATE game_best_times SET best_time_seconds = $1, attempts_count = $2, achieved_at = CURRENT_TIMESTAMP WHERE user_id = $3 AND deck_id = $4 AND game_type = $5',
            [time_seconds, oldAttempts + 1, userId, deck_id, 'match']
          );
          console.log(`🏆 New best time: ${time_seconds}s (improved from ${oldBestTime}s)`);
        } else {
          // ไม่ได้ทำสถิติใหม่ แต่เพิ่มจำนวนครั้งที่เล่น
          await client.query(
            'UPDATE game_best_times SET attempts_count = $1 WHERE user_id = $2 AND deck_id = $3 AND game_type = $4',
            [oldAttempts + 1, userId, deck_id, 'match']
          );
          console.log(`✓ Attempts updated (time: ${time_seconds}s, best: ${oldBestTime}s)`);
        }
      } else {
        // สร้างสถิติใหม่
        await client.query(
          'INSERT INTO game_best_times (user_id, deck_id, game_type, best_time_seconds, attempts_count) VALUES ($1, $2, $3, $4, $5)',
          [userId, deck_id, 'match', time_seconds, 1]
        );
        console.log(`🎉 First record created: ${time_seconds}s`);
      }

      return NextResponse.json({
        success: true,
        message: 'บันทึกเวลาสำเร็จ',
      });

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Error saving game time:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถบันทึกเวลาได้',
        details: error.message,
      },
      { status: 500 }
    );
  }
}