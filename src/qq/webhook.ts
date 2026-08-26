import { Env } from '../types';
import { QQWebhookEvent } from './types';
import { extractMessageText, getSenderId, sendReply } from './message';
import { isCommand, handleCommand } from '../commands';
import { processMessage } from '../ai/history';
import { checkRateLimit, getQQCredentials } from '../db/kv';
import { getOrCreateUser } from '../db/d1';
import nacl from 'tweetnacl';

// ed25519 签名 - 使用 tweetnacl（与 Go ed25519.Sign 结果一致）
export async function ed25519Sign(secret: string, message: string): Promise<string> {
  // 将 secret 作为 ed25519 种子，重复填充到 32 字节
  let seed = secret;
  while (seed.length < 32) seed += secret;
  seed = seed.slice(0, 32);

  const seedBytes = new TextEncoder().encode(seed);
  const messageBytes = new TextEncoder().encode(message);

  const keyPair = nacl.sign.keyPair.fromSeed(seedBytes);
  const signature = nacl.sign.detached(messageBytes, keyPair.secretKey);

  return Array.from(signature)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// 处理 QQ 回调验证请求
async function handleValidation(
  d: { plain_token: string; event_ts: string } | string,
  appSecret: string
): Promise<Response> {
  // 处理 d 可能是字符串的情况
  let validationPayload: { plain_token: string; event_ts: string };
  if (typeof d === 'string') {
    validationPayload = JSON.parse(d);
  } else {
    validationPayload = d;
  }

  const msg = validationPayload.event_ts + validationPayload.plain_token;
  const signature = await ed25519Sign(appSecret, msg);

  return new Response(
    JSON.stringify({ plain_token: validationPayload.plain_token, signature }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// 处理 Webhook 事件
export async function handleWebhook(env: Env, request: Request): Promise<Response> {
  const body = await request.text();
  const credentials = await getQQCredentials(env.KV);
  const appSecret = credentials?.appSecret || '';

  // 记录最近请求到 KV（调试用）
  try {
    const hdrs: Record<string, string> = {};
    request.headers.forEach((v, k) => { hdrs[k] = v; });
    await env.KV.put('debug:last_webhook', JSON.stringify({
      ts: new Date().toISOString(),
      url: request.url,
      method: request.method,
      headers: hdrs,
      body: body.slice(0, 2000),
      appSecretPrefix: appSecret.slice(0, 4),
    }));
  } catch (e) {
    console.error('Failed to log webhook:', e);
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // 处理回调验证请求（QQ 配置 Webhook 时发送）
  // QQ 的请求格式是 { d: { plain_token, event_ts } }
  // 但 d 可能是嵌套的 JSON 字符串
  if (payload.d) {
    const d = payload.d;
    // 检查 d 是否直接包含 plain_token 和 event_ts
    if (d.plain_token && d.event_ts) {
      if (!appSecret) {
        return new Response('QQ credentials not configured', { status: 500 });
      }
      return handleValidation(d, appSecret);
    }
    // 检查 d 是否是 JSON 字符串
    if (typeof d === 'string') {
      try {
        const parsed = JSON.parse(d);
        if (parsed.plain_token && parsed.event_ts) {
          if (!appSecret) {
            return new Response('QQ credentials not configured', { status: 500 });
          }
          return handleValidation(parsed, appSecret);
        }
      } catch {
        // 不是 JSON 字符串，继续处理其他事件
      }
    }
  }

  // 处理签名校验（普通事件）
  const event: QQWebhookEvent = payload;

  // 只处理消息事件
  if (event.type !== 'C2C_MESSAGE_CREATE' && event.type !== 'GROUP_AT_MESSAGE_CREATE') {
    return new Response('OK');
  }

  const userId = getSenderId(event);
  if (!userId) {
    return new Response('OK');
  }

  // 确保用户存在
  await getOrCreateUser(env.DB, userId);

  // 限流检查
  const { allowed } = await checkRateLimit(env.KV, userId);
  if (!allowed) {
    await sendReply(env, event, '请求过于频繁，请稍后再试。');
    return new Response('OK');
  }

  // 提取消息文本
  const text = extractMessageText(event);
  if (!text) {
    return new Response('OK');
  }

  try {
    let reply: string;

    if (isCommand(text)) {
      reply = await handleCommand(env, userId, text);
    } else {
      reply = await processMessage(env, userId, text);
    }

    await sendReply(env, event, reply);
  } catch (error) {
    console.error('Error processing message:', error);
    await sendReply(env, event, '处理消息时出错，请稍后再试。');
  }

  return new Response('OK');
}
