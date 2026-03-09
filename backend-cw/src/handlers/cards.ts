// worker/src/handlers/cards.ts
import { Env, jsonResponse, getUserId } from '../index';

export async function handleCards(request: Request, env: Env, path: string): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';
  const userId = await getUserId(request, env.JWT_SECRET);
  if (!userId) return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);

  const match = path.match(/^\/decks\/(\d+)\/cards/);
  const deckId = match ? parseInt(match[1]) : null;
  if (!deckId) return jsonResponse({ error: 'Not found' }, 404, origin);

  if (request.method === 'POST') {
    const { term, definition } = await request.json() as any;
    if (!term || !definition) return jsonResponse({ success: false, error: 'กรุณาใส่ทั้งคำศัพท์และคำตอบ' }, 400, origin);
    const deck = await env.DB.prepare('SELECT user_id FROM decks WHERE id = ?').bind(deckId).first<{ user_id: number }>();
    if (!deck) return jsonResponse({ success: false, error: 'ไม่พบชุดการ์ด' }, 404, origin);
    if (deck.user_id !== userId) return jsonResponse({ success: false, error: 'ไม่มีสิทธิ์เพิ่มการ์ด' }, 403, origin);
    await env.DB.prepare('INSERT INTO cards (deck_id, term, definition) VALUES (?, ?, ?)').bind(deckId, term.trim(), definition.trim()).run();
    const card = await env.DB.prepare('SELECT * FROM cards WHERE id = last_insert_rowid()').first();
    return jsonResponse({ success: true, card, message: 'เพิ่มการ์ดสำเร็จ' }, 200, origin);
  }

  return jsonResponse({ error: 'Not found' }, 404, origin);
}
