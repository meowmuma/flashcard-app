// worker/src/handlers/public-decks.ts
import { Env, jsonResponse, getUserId } from '../index';

export async function handlePublicDecks(request: Request, env: Env, path: string): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';
  const userId = await getUserId(request, env.JWT_SECRET); // optional
  const url = new URL(request.url);
  const db = env.DB;

  // GET /public-decks
  if (path === '/public-decks' && request.method === 'GET') {
    const sort = url.searchParams.get('sort') || 'newest';
    const orderBy = sort === 'popular' ? 'd.times_copied DESC, d.created_at DESC' : 'd.created_at DESC';
    const rows = await db.prepare(
      `SELECT d.id, d.title, d.description, d.category, d.is_public, d.share_code,
              d.times_copied, strftime('%Y-%m-%dT%H:%M:%SZ', d.created_at) as created_at,
              u.email as author_email, CAST(COUNT(c.id) AS INTEGER) as card_count,
              CASE WHEN d.user_id = ? THEN 1 ELSE 0 END as is_owner
       FROM decks d INNER JOIN users u ON d.user_id = u.id
       LEFT JOIN cards c ON d.id = c.deck_id
       WHERE d.is_public = 1 GROUP BY d.id, u.email ORDER BY ${orderBy}`
    ).bind(userId ?? 0).all();
    return jsonResponse({ success: true, decks: rows.results }, 200, origin);
  }

  // GET /public-decks/share/:shareCode
  const shareMatch = path.match(/^\/public-decks\/share\/([^/]+)$/);
  if (shareMatch && request.method === 'GET') {
    const shareCode = shareMatch[1].toUpperCase();
    const deck = await db.prepare(
      `SELECT d.id, d.title, d.description, d.category, d.share_code, d.times_copied, d.is_public,
              strftime('%Y-%m-%dT%H:%M:%SZ', d.created_at) as created_at, u.email as author_email,
              CAST(COUNT(DISTINCT c.id) AS INTEGER) as card_count
       FROM decks d LEFT JOIN cards c ON d.id = c.deck_id LEFT JOIN users u ON d.user_id = u.id
       WHERE d.share_code = ? AND d.is_public = 1 GROUP BY d.id, u.email`
    ).bind(shareCode).first<{ id: number } & Record<string, unknown>>();
    if (!deck) return jsonResponse({ error: 'ไม่พบชุดการ์ดนี้' }, 404, origin);
    const cards = await db.prepare('SELECT id, term, definition FROM cards WHERE deck_id = ? ORDER BY created_at ASC').bind(deck.id).all();
    return jsonResponse({ success: true, deck: { ...deck, cards: cards.results } }, 200, origin);
  }

  // POST /public-decks/:id/copy
  const copyMatch = path.match(/^\/public-decks\/(\d+)\/copy$/);
  if (copyMatch && request.method === 'POST') {
    if (!userId) return jsonResponse({ error: 'กรุณาเข้าสู่ระบบก่อน' }, 401, origin);
    const deckId = parseInt(copyMatch[1]);
    const original = await db.prepare(
      `SELECT d.*, u.id as original_author_id FROM decks d
       LEFT JOIN users u ON d.user_id = u.id WHERE d.id = ? AND d.is_public = 1`
    ).bind(deckId).first<Record<string, any>>();
    if (!original) return jsonResponse({ error: 'ไม่พบชุดการ์ดสาธารณะนี้' }, 404, origin);
    const existingCopy = await db.prepare('SELECT id FROM decks WHERE user_id = ? AND original_deck_id = ? LIMIT 1').bind(userId, deckId).first<{ id: number }>();
    if (existingCopy) return jsonResponse({ error: 'คุณเคยคัดลอกชุดการ์ดนี้ไปแล้ว', existing_deck_id: existingCopy.id }, 400, origin);
    await db.prepare(
      `INSERT INTO decks (user_id, title, description, category, is_public, original_deck_id, original_author_id, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'), datetime('now'))`
    ).bind(userId, original.title, original.description, original.category, deckId, original.original_author_id || original.user_id).run();
    const newDeck = await db.prepare('SELECT id, title FROM decks WHERE id = last_insert_rowid()').first<{ id: number; title: string }>();
    const cards = await db.prepare('SELECT term, definition FROM cards WHERE deck_id = ? ORDER BY created_at ASC').bind(deckId).all<{ term: string; definition: string }>();
    if (cards.results.length > 0) {
      await db.batch(cards.results.map(c => db.prepare('INSERT INTO cards (deck_id, term, definition) VALUES (?, ?, ?)').bind(newDeck!.id, c.term, c.definition)));
    }
    await db.prepare('UPDATE decks SET times_copied = times_copied + 1 WHERE id = ?').bind(deckId).run();
    return jsonResponse({ success: true, message: 'คัดลอกชุดการ์ดสำเร็จ', deck: newDeck }, 200, origin);
  }

  return jsonResponse({ error: 'Not found' }, 404, origin);
}
