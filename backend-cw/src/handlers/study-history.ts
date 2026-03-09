// worker/src/handlers/study-history.ts
import { Env, jsonResponse, getUserId } from '../index';

export async function handleStudyHistory(request: Request, env: Env): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';
  const userId = await getUserId(request, env.JWT_SECRET);
  if (!userId) return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);

  if (request.method === 'POST') {
    const { deck_id, total_cards, known_cards, unknown_cards } = await request.json() as any;
    if (deck_id == null || total_cards == null || known_cards == null || unknown_cards == null)
      return jsonResponse({ success: false, error: 'ข้อมูลไม่ครบถ้วน' }, 400, origin);
    const accuracy = total_cards > 0 ? Math.round((known_cards / total_cards) * 100) : 0;
    await env.DB.prepare(
      'INSERT INTO study_history (user_id, deck_id, total_cards, known_cards, unknown_cards, accuracy_percentage) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(userId, deck_id, total_cards, known_cards, unknown_cards, accuracy).run();
    const session = await env.DB.prepare('SELECT * FROM study_history WHERE id = last_insert_rowid()').first();
    return jsonResponse({ success: true, session, message: 'บันทึกประวัติการเรียนสำเร็จ' }, 200, origin);
  }

  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT sh.*, d.title as deck_title FROM study_history sh
       INNER JOIN decks d ON sh.deck_id = d.id
       WHERE sh.user_id = ? ORDER BY sh.completed_at DESC LIMIT 50`
    ).bind(userId).all();
    return jsonResponse({ success: true, sessions: result.results }, 200, origin);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, origin);
}
