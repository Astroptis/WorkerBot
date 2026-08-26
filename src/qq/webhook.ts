import { Env } from '../types';
import { QQWebhookEvent } from './types';
import { extractMessageText, getSenderId, sendReply } from './message';
import { isCommand, handleCommand } from '../commands';
import { processMessage } from '../ai/history';
import { checkRateLimit, getQQCredentials } from '../db/kv';
import { getOrCreateUser } from '../db/d1';

// 验证 QQ Webhook 签名
export function verifySignature(
  body: string,
  signature: string | null,
  timestamp: string | null,
  appSecret: string
): boolean {
  // QQ 官方验证逻辑（根据官方文档实现）
  if (!signature || !timestamp) return false;
  // TODO: 实现完整的签名验证
  return true;
}

// 处理 Webhook 事件
export async function handleWebhook(
  env: Env,
  request: Request
): Promise<Response> {
  const body = await request.text();

  // 获取 QQ 凭据
  const credentials = await getQQCredentials(env.KV);

  // 验证签名
  const signature = request.headers.get('X-Qq-Signature');
  const timestamp = request.headers.get('X-Qq-Timestamp');
  if (!verifySignature(body, signature, timestamp, credentials?.appSecret || '')) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event: QQWebhookEvent = JSON.parse(body);

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
