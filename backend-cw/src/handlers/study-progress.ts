// worker/src/handlers/study-progress.ts
import { Env, jsonResponse, getUserId } from '../index';

export async function handleStudyProgress(request: Request, env: Env): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';
  const userId = await getUserId(request, env.JWT_SECRET);
  if (!userId) return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);

  const url = new URL(request.url);
  const db = env.DB;

  // POST — บันทึก progress หรือ history
  if (request.method === 'POST') {
    const { deck_id, session_type = 'study', current_card_index = 0, total_cards,
      known_cards = 0, unknown_cards = 0, card_order = null, is_completed = false,
      time_spent_seconds = null } = await request.json() as any;

    if (!deck_id || !total_cards)
      return jsonResponse({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, 400, origin);

    if (!is_completed) {
      await db.prepare(
        `INSERT INTO study_progress
           (user_id, deck_id, session_type, current_card_index, total_cards, known_cards, unknown_cards, card_order, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, deck_id, session_type) DO UPDATE SET
           current_card_index = excluded.current_card_index,
           total_cards = excluded.total_cards,
           known_cards = excluded.known_cards,
           unknown_cards = excluded.unknown_cards,
           card_order = excluded.card_order,
           updated_at = datetime('now')`
      ).bind(userId, deck_id, session_type, current_card_index, total_cards, known_cards, unknown_cards, card_order).run();

      const progress = await db.prepare(
        'SELECT * FROM study_progress WHERE user_id = ? AND deck_id = ? AND session_type = ?'
      ).bind(userId, deck_id, session_type).first();
      return jsonResponse({ success: true, progress }, 200, origin);
    }

    const accuracy = total_cards > 0 ? Math.round((known_cards / total_cards) * 100) : 0;
    await db.batch([
      db.prepare('DELETE FROM study_progress WHERE user_id = ? AND deck_id = ? AND session_type = ?')
        .bind(userId, deck_id, session_type),
      db.prepare(
        `INSERT INTO study_history (user_id, deck_id, session_type, total_cards, known_cards, unknown_cards, accuracy_percentage, time_spent_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(userId, deck_id, session_type, total_cards, known_cards, unknown_cards, accuracy, time_spent_seconds),
    ]);
    const history = await db.prepare('SELECT * FROM study_history WHERE id = last_insert_rowid()').first();
    return jsonResponse({ success: true, history }, 200, origin);
  }

  // GET — ดึง progress
  if (request.method === 'GET') {
    const deckId = url.searchParams.get('deck_id');
    const sessionType = url.searchParams.get('session_type') || 'study';
    if (!deckId) return jsonResponse({ success: false, error: 'ไม่พบ deck_id' }, 400, origin);
    const progress = await db.prepare(
      'SELECT * FROM study_progress WHERE user_id = ? AND deck_id = ? AND session_type = ?'
    ).bind(userId, parseInt(deckId), sessionType).first();
    return jsonResponse({ success: true, progress: progress || null }, 200, origin);
  }

  // DELETE — ลบ progress
  if (request.method === 'DELETE') {
    const deckId = url.searchParams.get('deck_id');
    const sessionType = url.searchParams.get('session_type') || 'study';
    if (!deckId) return jsonResponse({ success: false, error: 'ไม่พบ deck_id' }, 400, origin);
    await db.prepare('DELETE FROM study_progress WHERE user_id = ? AND deck_id = ? AND session_type = ?')
      .bind(userId, parseInt(deckId), sessionType).run();
    return jsonResponse({ success: true }, 200, origin);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, origin);
}
