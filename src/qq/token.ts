import { Env } from '../types';
import { getQQAccessToken, setQQAccessToken, getQQCredentials } from '../db/kv';
import { QQTokenResponse } from './types';

const QQ_TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken';

export async function getAccessToken(env: Env): Promise<string> {
  const cached = await getQQAccessToken(env.KV);
  if (cached) return cached;

  const credentials = await getQQCredentials(env.KV);
  if (!credentials) {
    throw new Error('QQ credentials not configured. Please set them in admin panel.');
  }

  const response = await fetch(QQ_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: credentials.appId,
      clientSecret: credentials.appSecret,
    }),
  });

  const data = await response.json() as QQTokenResponse;
  if (data.code !== 0) {
    throw new Error(`Failed to get QQ access token: ${data.message}`);
  }

  await setQQAccessToken(env.KV, data.data.access_token, data.data.expires_in);
  return data.data.access_token;
}
