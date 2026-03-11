// worker/src/handlers/cards.ts
import { Env, jsonResponse, getUserId } from '../index';

export async function handleCards(request: Request, env: Env, path: string): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';
  const userId = await getUserId(request, env.JWT_SECRET);
  if (!userId) return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);

  const match = path.match(/^\/decks\/(\d+)\/cards(?:\/(\d+))?/);
  if (!match) return jsonResponse({ error: 'Not found' }, 404, origin);
  const deckId = parseInt(match[1]);
  const cardId = match[2] ? parseInt(match[2]) : null;

  const deck = await env.DB.prepare('SELECT user_id FROM decks WHERE id = ?').bind(deckId).first<{ user_id: number }>();
  if (!deck) return jsonResponse({ success: false, error: 'ไม่พบชุดการ์ด' }, 404, origin);
  if (deck.user_id !== userId) return jsonResponse({ success: false, error: 'ไม่มีสิทธิ์จัดการการ์ดในชุดนี้' }, 403, origin);

  if (!cardId && request.method === 'POST') {
    const { term, definition } = await request.json() as any;
    if (!term || !definition) return jsonResponse({ success: false, error: 'กรุณาใส่ทั้งคำศัพท์และคำตอบ' }, 400, origin);
    const card = await env.DB.prepare('INSERT INTO cards (deck_id, term, definition) VALUES (?, ?, ?) RETURNING *').bind(deckId, term.trim(), definition.trim()).first();
    return jsonResponse({ success: true, card, message: 'เพิ่มการ์ดสำเร็จ' }, 200, origin);
  }

  if (cardId && request.method === 'PUT') {
    const { term, definition } = await request.json() as any;
    if (!term || !definition) return jsonResponse({ success: false, error: 'กรุณาใส่ทั้งคำศัพท์และคำตอบ' }, 400, origin);
    const existingCard = await env.DB.prepare('SELECT id FROM cards WHERE id = ? AND deck_id = ?').bind(cardId, deckId).first();
    if (!existingCard) return jsonResponse({ success: false, error: 'ไม่พบการ์ด' }, 404, origin);
    const card = await env.DB.prepare('UPDATE cards SET term = ?, definition = ? WHERE id = ? RETURNING *').bind(term.trim(), definition.trim(), cardId).first();
    return jsonResponse({ success: true, card, message: 'แก้ไขการ์ดสำเร็จ' }, 200, origin);
  }

  if (cardId && request.method === 'DELETE') {
    const existingCard = await env.DB.prepare('SELECT id FROM cards WHERE id = ? AND deck_id = ?').bind(cardId, deckId).first();
    if (!existingCard) return jsonResponse({ success: false, error: 'ไม่พบการ์ด' }, 404, origin);
    await env.DB.prepare('DELETE FROM cards WHERE id = ?').bind(cardId).run();
    return jsonResponse({ success: true, message: 'ลบการ์ดสำเร็จ' }, 200, origin);
  }

  return jsonResponse({ error: 'Not found or Method not allowed' }, 404, origin);
}
