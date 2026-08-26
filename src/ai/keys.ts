import { Env } from '../types';
import { ApiKeyConfig, getEnabledKeys } from '../db/kv';

let currentIndex = 0;

export async function selectApiKey(env: Env): Promise<ApiKeyConfig> {
  const keys = await getEnabledKeys(env.KV);
  if (keys.length === 0) {
    throw new Error('No enabled API keys available');
  }
  const selected = keys[currentIndex % keys.length];
  currentIndex = (currentIndex + 1) % keys.length;
  return selected;
}
