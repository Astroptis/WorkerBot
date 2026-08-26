import { Env } from '../types';
import { getQQAccessToken, setQQAccessToken } from '../db/kv';
import { QQTokenResponse } from './types';

const QQ_TOKEN_URL = 'https://bots.qq.com/app/getAppAccessToken';

export async function getAccessToken(env: Env): Promise<string> {
  const cached = await getQQAccessToken(env.KV);
  if (cached) return cached;

  const response = await fetch(QQ_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: env.QQ_APP_ID,
      clientSecret: env.QQ_APP_SECRET,
    }),
  });

  const data = await response.json() as QQTokenResponse;
  if (data.code !== 0) {
    throw new Error(`Failed to get QQ access token: ${data.message}`);
  }

  await setQQAccessToken(env.KV, data.data.access_token, data.data.expires_in);
  return data.data.access_token;
}
