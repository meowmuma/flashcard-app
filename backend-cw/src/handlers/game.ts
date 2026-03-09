// worker/src/handlers/game.ts
import { Env, jsonResponse, getUserId } from '../index';

export async function handleGame(request: Request, env: Env, path: string): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';
  const userId = await getUserId(request, env.JWT_SECRET);
  if (!userId) return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);

  const url = new URL(request.url);
  const db = env.DB;

  // ── GET /game/best-time ──
  if (path === '/game/best-time' && request.method === 'GET') {
    const deck_id = url.searchParams.get('deck_id');
    const game_type = url.searchParams.get('game_type') || 'matching';
    if (!deck_id) return jsonResponse({ success: false, error: 'ไม่พบ deck_id' }, 400, origin);
    const row = await db.prepare(
      'SELECT best_time_seconds, last_time_seconds, attempts_count, achieved_at, last_played_at FROM game_best_times WHERE user_id = ? AND deck_id = ? AND game_type = ?'
    ).bind(userId, parseInt(deck_id), game_type).first();
    return jsonResponse({ success: true, best_time: row || null }, 200, origin);
  }

  // ── POST /game/best-time ──
  if (path === '/game/best-time' && request.method === 'POST') {
    const { deck_id, game_type = 'matching', time_seconds } = await request.json() as any;
    if (!deck_id || time_seconds == null || time_seconds <= 0)
      return jsonResponse({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400, origin);

    const rounded = Math.round(parseFloat(time_seconds) * 10) / 10;
    const existing = await db.prepare(
      'SELECT best_time_seconds, attempts_count FROM game_best_times WHERE user_id = ? AND deck_id = ? AND game_type = ?'
    ).bind(userId, deck_id, game_type).first<{ best_time_seconds: number; attempts_count: number }>();

    let is_new_best = false;
    let new_best: number;
    let new_attempts: number;

    if (existing) {
      is_new_best = rounded < existing.best_time_seconds;
      new_best = is_new_best ? rounded : existing.best_time_seconds;
      new_attempts = (existing.attempts_count || 0) + 1;
      if (is_new_best) {
        await db.prepare(
          `UPDATE game_best_times SET best_time_seconds=?, last_time_seconds=?, attempts_count=?, achieved_at=datetime('now'), last_played_at=datetime('now') WHERE user_id=? AND deck_id=? AND game_type=?`
        ).bind(rounded, rounded, new_attempts, userId, deck_id, game_type).run();
      } else {
        await db.prepare(
          `UPDATE game_best_times SET last_time_seconds=?, attempts_count=?, last_played_at=datetime('now') WHERE user_id=? AND deck_id=? AND game_type=?`
        ).bind(rounded, new_attempts, userId, deck_id, game_type).run();
      }
    } else {
      is_new_best = true;
      new_best = rounded;
      new_attempts = 1;
      await db.prepare(
        `INSERT INTO game_best_times (user_id, deck_id, game_type, best_time_seconds, last_time_seconds, attempts_count, achieved_at, last_played_at) VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
      ).bind(userId, deck_id, game_type, rounded, rounded).run();
    }

    return jsonResponse({ success: true, is_new_best, best_time_seconds: new_best, last_time_seconds: rounded, attempts_count: new_attempts }, 200, origin);
  }

  // ── POST /game/save-time (legacy) ──
  if (path === '/game/save-time' && request.method === 'POST') {
    const { deck_id, time_seconds } = await request.json() as any;
    if (!deck_id || !time_seconds || time_seconds <= 0)
      return jsonResponse({ success: false, error: 'ข้อมูลไม่ถูกต้อง' }, 400, origin);
    const existing = await db.prepare(
      'SELECT best_time_seconds, attempts_count FROM game_best_times WHERE user_id = ? AND deck_id = ? AND game_type = ?'
    ).bind(userId, deck_id, 'match').first<{ best_time_seconds: number; attempts_count: number }>();
    if (existing) {
      if (time_seconds < existing.best_time_seconds) {
        await db.prepare(
          `UPDATE game_best_times SET best_time_seconds=?, attempts_count=?, achieved_at=datetime('now') WHERE user_id=? AND deck_id=? AND game_type=?`
        ).bind(time_seconds, (existing.attempts_count || 0) + 1, userId, deck_id, 'match').run();
      } else {
        await db.prepare('UPDATE game_best_times SET attempts_count=? WHERE user_id=? AND deck_id=? AND game_type=?')
          .bind((existing.attempts_count || 0) + 1, userId, deck_id, 'match').run();
      }
    } else {
      await db.prepare(
        `INSERT INTO game_best_times (user_id, deck_id, game_type, best_time_seconds, attempts_count) VALUES (?, ?, 'match', ?, 1)`
      ).bind(userId, deck_id, time_seconds).run();
    }
    return jsonResponse({ success: true, message: 'บันทึกเวลาสำเร็จ' }, 200, origin);
  }

  return jsonResponse({ error: 'Not found' }, 404, origin);
}
