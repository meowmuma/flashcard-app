// src/app/lib/worker.ts
// Helper สำหรับ Next.js API routes — เรียก Cloudflare Worker แทน DB โดยตรง

const WORKER_URL = process.env.WORKER_URL!;
// ตั้งค่าใน Vercel: WORKER_URL = https://jamman-api.YOUR_SUBDOMAIN.workers.dev

if (!WORKER_URL) {
  console.warn('⚠️  WORKER_URL is not set in environment variables');
}

export async function callWorker(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
    searchParams?: Record<string, string>;
  } = {}
): Promise<{ data: unknown; status: number }> {
  const { method = 'GET', body, token, searchParams } = options;

  let url = `${WORKER_URL}${path}`;
  if (searchParams) {
    const params = new URLSearchParams(searchParams);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { data, status: res.status };
}

export function extractToken(
  request: import('next/server').NextRequest
): string | null {
  const auth = request.headers.get('Authorization');
  return auth?.replace('Bearer ', '') || null;
}
