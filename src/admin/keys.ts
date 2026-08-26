import { Env } from '../types';
import { getAllKeys, setApiKey, deleteApiKey, ApiKeyConfig } from '../db/kv';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleGetKeys(env: Env): Promise<Response> {
  const keys = await getAllKeys(env.KV);
  const safe = keys.map(k => ({
    ...k,
    apiKey: k.apiKey.slice(0, 8) + '***',
  }));
  return jsonResponse({ keys: safe });
}

export async function handleCreateKey(env: Env, body: Omit<ApiKeyConfig, 'id' | 'createdAt'>): Promise<Response> {
  const id = crypto.randomUUID();
  const config: ApiKeyConfig = {
    ...body,
    id,
    createdAt: Date.now(),
  };
  await setApiKey(env.KV, config);
  return jsonResponse({ key: config }, 201);
}

export async function handleUpdateKey(env: Env, keyId: string, body: Partial<ApiKeyConfig>): Promise<Response> {
  const existing = await getAllKeys(env.KV);
  const key = existing.find(k => k.id === keyId);
  if (!key) return jsonResponse({ error: 'Key not found' }, 404);

  const updated = { ...key, ...body, id: keyId };
  await setApiKey(env.KV, updated);
  return jsonResponse({ key: updated });
}

export async function handleDeleteKey(env: Env, keyId: string): Promise<Response> {
  await deleteApiKey(env.KV, keyId);
  return jsonResponse({ success: true });
}