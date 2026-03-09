// worker/src/handlers/decks.ts
import { Env, jsonResponse, getUserId } from '../index';

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function handleDecks(request: Request, env: Env, path: string): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';
  const userId = await getUserId(request, env.JWT_SECRET);
  if (!userId) return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);

  const deckIdMatch = path.match(/^\/decks\/(\d+)$/);
  const deckId = deckIdMatch ? parseInt(deckIdMatch[1]) : null;

  // ── GET /decks ──
  if (path === '/decks' && request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT d.*, COUNT(c.id) as card_count FROM decks d
       LEFT JOIN cards c ON d.id = c.deck_id
       WHERE d.user_id = ? GROUP BY d.id ORDER BY d.updated_at DESC`
    ).bind(userId).all();
    return jsonResponse({ success: true, decks: result.results }, 200, origin);
  }

  // ── POST /decks ──
  if (path === '/decks' && request.method === 'POST') {
    const body = await request.json() as any;
    const { title, description, category, is_public, cards = [] } = body;

    if (!title?.trim()) return jsonResponse({ success: false, error: 'กรุณาใส่ชื่อชุดการ์ด' }, 400, origin);
    if (is_public && !description?.trim()) return jsonResponse({ success: false, error: 'กรุณาใส่คำอธิบาย' }, 400, origin);
    if (is_public && !category?.trim()) return jsonResponse({ success: false, error: 'กรุณาเลือกภาษา' }, 400, origin);

    const userExists = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
    if (!userExists) return jsonResponse({ success: false, error: 'ไม่พบข้อมูลผู้ใช้' }, 400, origin);

    const shareCode = is_public ? generateShareCode() : null;
    await env.DB.prepare(
      `INSERT INTO decks (user_id, title, description, category, is_public, share_code, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(userId, title.trim(), description?.trim() || null, category?.trim() || null, is_public ? 1 : 0, shareCode).run();

    const deck = await env.DB.prepare('SELECT * FROM decks WHERE id = last_insert_rowid()')
      .first<{ id: number } & Record<string, unknown>>();

    const validCards = (cards as any[]).filter(c => c.term?.trim() && c.definition?.trim());
    if (validCards.length > 0) {
      await env.DB.batch(
        validCards.map((c, i) =>
          env.DB.prepare('INSERT INTO cards (deck_id, term, definition, position) VALUES (?, ?, ?, ?)')
            .bind(deck!.id, c.term.trim(), c.definition.trim(), i)
        )
      );
    }

    const deckWithCount = await env.DB.prepare(
      `SELECT d.*, COUNT(c.id) as card_count FROM decks d
       LEFT JOIN cards c ON d.id = c.deck_id WHERE d.id = ? GROUP BY d.id`
    ).bind(deck!.id).first();
    return jsonResponse({ success: true, deck: deckWithCount, message: 'สร้างชุดการ์ดสำเร็จ' }, 200, origin);
  }

  // ── GET /decks/:id ──
  if (deckId && request.method === 'GET') {
    const deck = await env.DB.prepare(
      `SELECT d.*, u.email as author_email FROM decks d
       INNER JOIN users u ON d.user_id = u.id
       WHERE d.id = ? AND (d.user_id = ? OR d.is_public = 1)`
    ).bind(deckId, userId).first();
    if (!deck) return jsonResponse({ success: false, error: 'ไม่พบชุดการ์ด' }, 404, origin);
    const cards = await env.DB.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY id').bind(deckId).all();
    return jsonResponse({ success: true, deck, cards: cards.results }, 200, origin);
  }

  // ── PUT /decks/:id ──
  if (deckId && request.method === 'PUT') {
    const { title, description, category, is_public } = await request.json() as any;
    if (!title?.trim()) return jsonResponse({ success: false, error: 'กรุณาใส่ชื่อชุดการ์ด' }, 400, origin);
    const existing = await env.DB.prepare('SELECT user_id FROM decks WHERE id = ?').bind(deckId).first<{ user_id: number }>();
    if (!existing) return jsonResponse({ success: false, error: 'ไม่พบชุดการ์ด' }, 404, origin);
    if (existing.user_id !== userId) return jsonResponse({ success: false, error: 'ไม่มีสิทธิ์แก้ไข' }, 403, origin);
    await env.DB.prepare(
      `UPDATE decks SET title=?, description=?, category=?, is_public=?, updated_at=datetime('now') WHERE id=? AND user_id=?`
    ).bind(title.trim(), description || null, category || null, is_public ? 1 : 0, deckId, userId).run();
    const deck = await env.DB.prepare('SELECT * FROM decks WHERE id = ?').bind(deckId).first();
    return jsonResponse({ success: true, deck, message: 'อัพเดตชุดการ์ดสำเร็จ' }, 200, origin);
  }

  // ── DELETE /decks/:id ──
  if (deckId && request.method === 'DELETE') {
    const deck = await env.DB.prepare('SELECT user_id FROM decks WHERE id = ? AND user_id = ?').bind(deckId, userId).first();
    if (!deck) return jsonResponse({ success: false, error: 'ไม่พบชุดการ์ดหรือไม่มีสิทธิ์ลบ' }, 404, origin);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM cards WHERE deck_id = ?').bind(deckId),
      env.DB.prepare('DELETE FROM study_progress WHERE deck_id = ?').bind(deckId),
      env.DB.prepare('DELETE FROM game_best_times WHERE deck_id = ?').bind(deckId),
      env.DB.prepare('DELETE FROM decks WHERE id = ?').bind(deckId),
    ]);
    return jsonResponse({ success: true, message: 'ลบชุดการ์ดสำเร็จ' }, 200, origin);
  }

  return jsonResponse({ error: 'Not found' }, 404, origin);
}
