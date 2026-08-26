import { Env } from '../types';
import { getAdminPassword, setAdminPassword } from '../db/kv';

// SHA-256 哈希
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 简单的 JWT 实现
async function createToken(secret: string, data: Record<string, unknown>): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ ...data, exp: Date.now() + 86400000 }));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode(`${header}.${payload}`)
  );
  return `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
}

export async function verifyToken(secret: string, token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

// 登录处理
export async function handleLogin(env: Env, body: { password: string }): Promise<Response> {
  const stored = await getAdminPassword(env.KV);

  // 首次登录，设置密码
  if (!stored) {
    if (!env.ADMIN_INIT_PASSWORD) {
      return jsonResponse({ error: '未配置初始密码' }, 400);
    }
    if (body.password !== env.ADMIN_INIT_PASSWORD) {
      return jsonResponse({ error: '密码错误' }, 401);
    }
    const hash = await hashPassword(body.password);
    await setAdminPassword(env.KV, hash);
    const token = await createToken(body.password, { role: 'admin' });
    return jsonResponse({ token });
  }

  // 验证密码
  const inputHash = await hashPassword(body.password);
  if (inputHash !== stored) {
    return jsonResponse({ error: '密码错误' }, 401);
  }

  const token = await createToken(body.password, { role: 'admin' });
  return jsonResponse({ token });
}

// 验证请求
export async function verifyAuth(env: Env, request: Request): Promise<boolean> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  return verifyToken(env.ADMIN_INIT_PASSWORD || '', auth.slice(7));
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}