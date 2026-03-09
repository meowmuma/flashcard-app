// worker/src/handlers/auth.ts
import { Env, jsonResponse, signJwt, verifyPassword, hashPassword } from '../index';

export async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  const origin = env.ALLOWED_ORIGIN || '*';

  // POST /auth/login
  if (path === '/auth/login' && request.method === 'POST') {
    const { username, email, password } = await request.json() as any;
    const identifier = username || email;
    if (!identifier || !password)
      return jsonResponse({ error: 'กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่าน' }, 400, origin);

    const user = await env.DB
      .prepare('SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?')
      .bind(identifier, identifier)
      .first<{ id: number; username: string; email: string; password_hash: string }>();

    if (!user || !(await verifyPassword(password, user.password_hash)))
      return jsonResponse({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, 401, origin);

    const token = await signJwt({ userId: user.id, username: user.username }, env.JWT_SECRET);
    return jsonResponse({ success: true, token, user: { id: user.id, username: user.username, email: user.email } }, 200, origin);
  }

  // POST /auth/register
  if (path === '/auth/register' && request.method === 'POST') {
    const { name, username, email, password } = await request.json() as any;
    if (!name || !username || !email || !password)
      return jsonResponse({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, 400, origin);

    const existing = await env.DB
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .bind(username, email).first();
    if (existing)
      return jsonResponse({ error: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้งานแล้ว' }, 400, origin);

    const hashed = await hashPassword(password);
    await env.DB.prepare('INSERT INTO users (name, username, email, password_hash) VALUES (?, ?, ?, ?)')
      .bind(name, username, email, hashed).run();

    const user = await env.DB
      .prepare('SELECT id, name, username, email FROM users WHERE id = last_insert_rowid()')
      .first<{ id: number; name: string; username: string; email: string }>();

    const token = await signJwt({ userId: user!.id, username: user!.username }, env.JWT_SECRET);
    return jsonResponse({ success: true, token, user }, 200, origin);
  }

  // POST /auth/reset-password
  if (path === '/auth/reset-password' && request.method === 'POST') {
    const { email, newPassword } = await request.json() as any;
    if (!email || !newPassword)
      return jsonResponse({ error: 'กรุณากรอกอีเมลและรหัสผ่านใหม่' }, 400, origin);
    if (newPassword.length < 6)
      return jsonResponse({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }, 400, origin);

    const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (!user) return jsonResponse({ error: 'ไม่พบอีเมลนี้ในระบบ' }, 404, origin);

    const hashed = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE email = ?').bind(hashed, email).run();
    return jsonResponse({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' }, 200, origin);
  }

  return jsonResponse({ error: 'Not found' }, 404, origin);
}
