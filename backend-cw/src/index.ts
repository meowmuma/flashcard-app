// worker/src/index.ts
// Cloudflare Worker — proxy ระหว่าง Vercel Next.js กับ Cloudflare D1
// Deploy แยกต่างหาก ไม่เกี่ยวกับ Vercel

import { handleAuth } from './handlers/auth';
import { handleDecks } from './handlers/decks';
import { handleCards } from './handlers/cards';
import { handleStudyProgress } from './handlers/study-progress';
import { handleStudyHistory } from './handlers/study-history';
import { handleGame } from './handlers/game';
import { handlePublicDecks } from './handlers/public-decks';
import { handleAllProgress } from './handlers/all-progress';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  ALLOWED_ORIGIN: string; // URL ของ Vercel app เช่น https://jamman.vercel.app
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS — อนุญาตเฉพาะ Vercel app
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(allowedOrigin),
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      let response: Response;

      // Route matching
      if (path.startsWith('/auth/')) {
        response = await handleAuth(request, env, path);
      } else if (path.match(/^\/decks\/\d+\/cards/)) {
        response = await handleCards(request, env, path);
      } else if (path.startsWith('/decks')) {
        response = await handleDecks(request, env, path);
      } else if (path.startsWith('/study-progress')) {
        response = await handleStudyProgress(request, env);
      } else if (path.startsWith('/study-history')) {
        response = await handleStudyHistory(request, env);
      } else if (path.startsWith('/game/')) {
        response = await handleGame(request, env, path);
      } else if (path.startsWith('/public-decks')) {
        response = await handlePublicDecks(request, env, path);
      } else if (path.startsWith('/all-progress')) {
        response = await handleAllProgress(request, env);
      } else {
        response = new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // เพิ่ม CORS headers ทุก response
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders(allowedOrigin)).forEach(([k, v]) => newHeaders.set(k, v));
      return new Response(response.body, { status: response.status, headers: newHeaders });

    } catch (err: any) {
      console.error('Worker error:', err);
      return jsonResponse({ error: 'Internal server error' }, 500, allowedOrigin);
    }
  },
};

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function jsonResponse(data: unknown, status = 200, origin = '*'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

// ── JWT helper (Web Crypto — ไม่ต้อง install package) ──────────────────────

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeB64url(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array([...atob(b64)].map(c => c.charCodeAt(0)));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

export async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(new TextEncoder().encode(JSON.stringify({ ...payload, iat: now, exp: now + 7 * 86400 })));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown>> {
  const [header, body, sig] = token.split('.');
  if (!header || !body || !sig) throw new Error('Invalid token');
  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, decodeB64url(sig), new TextEncoder().encode(`${header}.${body}`));
  if (!valid) throw new Error('Invalid signature');
  const payload = JSON.parse(new TextDecoder().decode(decodeB64url(body)));
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

export async function getUserId(request: Request, secret: string): Promise<number | null> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const payload = await verifyJwt(token, secret);
    return payload.userId as number;
  } catch {
    return null;
  }
}

// ── Password helper (PBKDF2 — ไม่ต้อง install package) ────────────────────

function hexTo(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex: string) {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) a[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return a;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2:100000:${hexTo(salt.buffer)}:${hexTo(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('$2')) return false; // bcrypt hash เก่า
  const [, iter, saltHex, hashHex] = stored.split(':');
  const salt = fromHex(saltHex);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: parseInt(iter), hash: 'SHA-256' }, key, 256);
  const newHash = new Uint8Array(hash);
  const oldHash = fromHex(hashHex);
  if (newHash.length !== oldHash.length) return false;
  let diff = 0;
  for (let i = 0; i < newHash.length; i++) diff |= newHash[i] ^ oldHash[i];
  return diff === 0;
}
