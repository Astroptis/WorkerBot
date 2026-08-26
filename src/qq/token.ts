import { Env } from '../types';
import { getQQCredentials } from '../db/kv';

const QQ_TOKEN_URL = 'https://api.bot.qq.com/app/getAppAccessToken';

// 内存缓存 access token，减少重复请求
let cachedToken: string | null = null;
let cachedTokenExpiry = 0;

export async function getAccessToken(env: Env): Promise<string> {
  // 内存缓存命中
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const credentials = await getQQCredentials(env.KV);
  if (!credentials) {
    throw new Error('QQ credentials not configured. Please set them in admin panel.');
  }

  const response = await fetch(QQ_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: String(credentials.appId),
      clientSecret: credentials.appSecret,
    }),
  });

  const responseText = await response.text();
  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`QQ token API returned non-JSON: ${responseText.slice(0, 200)}`);
  }

  // 成功响应格式：{ access_token, expires_in }；失败响应格式：{ code, message }
  if (data.code !== undefined && data.code !== 0) {
    throw new Error(`Failed to get QQ access token: code=${data.code} msg=${data.message}`);
  }

  if (!data.access_token) {
    throw new Error(`QQ token API missing access_token: ${JSON.stringify(data)}`);
  }

  // 缓存到内存（提前 60 秒过期刷新）
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return data.access_token;
}
