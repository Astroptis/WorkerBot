import { Env } from '../types';
import { ApiKeyConfig, getEnabledKeys } from '../db/kv';

let currentIndex = 0;

// 内存缓存启用中的 key 列表，避免每次请求都做 KV.list
let cachedKeys: ApiKeyConfig[] | null = null;
let cacheExpiry = 0;

export async function selectApiKey(env: Env): Promise<ApiKeyConfig> {
  let keys = cachedKeys;
  if (!keys || Date.now() > cacheExpiry) {
    keys = await getEnabledKeys(env.KV);
    // 缓存 30 秒
    cachedKeys = keys;
    cacheExpiry = Date.now() + 30000;
  }
  if (keys.length === 0) {
    throw new Error('No enabled API keys available');
  }
  const selected = keys[currentIndex % keys.length];
  currentIndex = (currentIndex + 1) % keys.length;
  return selected;
}
