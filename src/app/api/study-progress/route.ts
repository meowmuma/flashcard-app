import { NextRequest, NextResponse } from 'next/server'
import pool from '../../lib/db'
import jwt from 'jsonwebtoken'

function getUserId(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!token) {
    throw new Error('NO_TOKEN')
  }

  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    throw new Error('JWT_SECRET_NOT_FOUND')
  }

  const decoded: any = jwt.verify(token, jwtSecret)

  return decoded.userId
}

export async function POST(request: NextRequest) {
  console.log('💾 Saving study progress/history...')

  try {
    const userId = getUserId(request)

    const body = await request.json()

    const {
      deck_id,
      session_type = 'study',
      current_card_index = 0,
      total_cards,
      known_cards = 0,
      unknown_cards = 0,
      card_order = null,
      is_completed = false,
      time_spent_seconds = null
    } = body

    if (!deck_id || !total_cards) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      )
    }

    const client = await pool.connect()

    try {

      // ----------------------
      // PROGRESS (ยังเล่นไม่จบ)
      // ----------------------

      if (!is_completed) {

        const result = await client.query(
          `INSERT INTO study_progress
           (user_id, deck_id, session_type, current_card_index, total_cards, known_cards, unknown_cards, card_order)

           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)

           ON CONFLICT (user_id, deck_id, session_type)

           DO UPDATE SET
             current_card_index = EXCLUDED.current_card_index,
             total_cards = EXCLUDED.total_cards,
             known_cards = EXCLUDED.known_cards,
             unknown_cards = EXCLUDED.unknown_cards,
             card_order = EXCLUDED.card_order

           RETURNING *`,
          [
            userId,
            deck_id,
            session_type,
            current_card_index,
            total_cards,
            known_cards,
            unknown_cards,
            card_order
          ]
        )

        console.log(`✅ Progress saved: ${current_card_index}/${total_cards}`)

        return NextResponse.json({
          success: true,
          progress: result.rows[0]
        })
      }

      // ----------------------
      // FINISHED SESSION
      // ----------------------

      const accuracy_percentage =
        total_cards > 0
          ? Math.round((known_cards / total_cards) * 100)
          : 0

      await client.query(
        `DELETE FROM study_progress
         WHERE user_id = $1
         AND deck_id = $2
         AND session_type = $3`,
        [userId, deck_id, session_type]
      )

      const historyResult = await client.query(
        `INSERT INTO study_history
         (user_id, deck_id, session_type, total_cards, known_cards, unknown_cards, accuracy_percentage, time_spent_seconds)

         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)

         RETURNING *`,
        [
          userId,
          deck_id,
          session_type,
          total_cards,
          known_cards,
          unknown_cards,
          accuracy_percentage,
          time_spent_seconds
        ]
      )

      console.log(`✅ History saved (${accuracy_percentage}%)`)

      return NextResponse.json({
        success: true,
        history: historyResult.rows[0]
      })

    } finally {
      client.release()
    }

  } catch (error: any) {

    if (error.message === 'NO_TOKEN') {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ token' },
        { status: 401 }
      )
    }

    console.error('❌ Error saving progress:', error)

    return NextResponse.json(
      { success: false, error: 'ไม่สามารถบันทึกข้อมูลได้' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {

  try {
    const userId = getUserId(request)

    const searchParams = request.nextUrl.searchParams
    const deckId = searchParams.get('deck_id')
    const sessionType = searchParams.get('session_type') || 'study'

    if (!deckId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ deck_id' },
        { status: 400 }
      )
    }

    const client = await pool.connect()

    try {

      const result = await client.query(
        `SELECT *
         FROM study_progress
         WHERE user_id = $1
         AND deck_id = $2
         AND session_type = $3`,
        [userId, parseInt(deckId), sessionType]
      )

      return NextResponse.json({
        success: true,
        progress: result.rows[0] || null
      })

    } finally {
      client.release()
    }

  } catch (error: any) {

    console.error('❌ Error fetching progress:', error)

    return NextResponse.json(
      { success: false },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {

  try {

    const userId = getUserId(request)

    const searchParams = request.nextUrl.searchParams
    const deckId = searchParams.get('deck_id')
    const sessionType = searchParams.get('session_type') || 'study'

    if (!deckId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ deck_id' },
        { status: 400 }
      )
    }

    const client = await pool.connect()

    try {

      await client.query(
        `DELETE FROM study_progress
         WHERE user_id = $1
         AND deck_id = $2
         AND session_type = $3`,
        [userId, parseInt(deckId), sessionType]
      )

      return NextResponse.json({
        success: true
      })

    } finally {
      client.release()
    }

  } catch (error) {

    console.error('❌ Error deleting progress:', error)

    return NextResponse.json(
      { success: false },
      { status: 500 }
    )
  }
}