// worker/src/handlers/all-progress.ts
import { Env, jsonResponse, getUserId } from '../index';

export async function handleAllProgress(request: Request, env: Env): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';
  const userId = await getUserId(request, env.JWT_SECRET);
  if (!userId) return jsonResponse({ success: false, error: 'Unauthorized' }, 401, origin);

  const db = env.DB;

  const progressRows = await db.prepare(
    `SELECT sp.id, sp.deck_id, d.title AS deck_title, sp.session_type,
            sp.total_cards, sp.known_cards, sp.unknown_cards, sp.current_card_index,
            NULL AS accuracy_percentage, NULL AS time_spent_seconds,
            NULL AS completed_at, NULL AS best_time_seconds,
            strftime('%Y-%m-%dT%H:%M:%SZ', sp.updated_at) AS updated_at,
            'progress' AS data_type
     FROM study_progress sp INNER JOIN decks d ON sp.deck_id = d.id
     WHERE sp.user_id = ? ORDER BY sp.updated_at DESC`
  ).bind(userId).all();

  const historyRows = await db.prepare(
    `SELECT sh.id, sh.deck_id, d.title AS deck_title, sh.session_type,
            sh.total_cards, sh.known_cards, sh.unknown_cards,
            NULL AS current_card_index, sh.accuracy_percentage,
            CASE WHEN sh.session_type = 'match' THEN gbt.last_time_seconds
                 ELSE sh.time_spent_seconds END AS time_spent_seconds,
            strftime('%Y-%m-%dT%H:%M:%SZ', sh.completed_at) AS completed_at,
            strftime('%Y-%m-%dT%H:%M:%SZ', sh.completed_at) AS updated_at,
            gbt.best_time_seconds, 'history' AS data_type
     FROM study_history sh
     INNER JOIN decks d ON sh.deck_id = d.id
     LEFT JOIN game_best_times gbt
       ON gbt.user_id = sh.user_id AND gbt.deck_id = sh.deck_id
       AND gbt.game_type = 'match' AND sh.session_type = 'match'
     WHERE sh.user_id = ?
       AND sh.id = (
         SELECT id FROM study_history sh2
         WHERE sh2.user_id = sh.user_id AND sh2.deck_id = sh.deck_id AND sh2.session_type = sh.session_type
         ORDER BY sh2.completed_at DESC LIMIT 1
       )
     ORDER BY sh.completed_at DESC`
  ).bind(userId).all();

  const allData = [...progressRows.results, ...historyRows.results].sort((a: any, b: any) => {
    const tA = new Date(a.completed_at || a.updated_at).getTime();
    const tB = new Date(b.completed_at || b.updated_at).getTime();
    return tB - tA;
  });

  return jsonResponse({ success: true, data: allData }, 200, origin);
}
