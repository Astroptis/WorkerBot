import { Env } from '../types';
import { QQWebhookEvent } from './types';
import { getAccessToken } from './token';

const QQ_API_BASE = 'https://api.sgroup.qq.com';

// 从 Webhook 事件中提取消息文本
export function extractMessageText(event: QQWebhookEvent): string {
  const content = event.raw.content || '';
  return content.replace(/@\S+\s*/g, '').trim();
}

// 获取发送者信息
export function getSenderId(event: QQWebhookEvent): string {
  return event.raw.author.member_openid || event.raw.author.user_openid || '';
}

// 获取群 ID（如果有）
export function getGroupId(event: QQWebhookEvent): string | undefined {
  return event.raw.group_openid;
}

// 判断是否为群消息
export function isGroupMessage(event: QQWebhookEvent): boolean {
  return !!event.raw.group_openid;
}

// 发送私聊消息
export async function sendPrivateMessage(
  env: Env,
  openid: string,
  content: string,
  msgId?: string
): Promise<void> {
  const token = await getAccessToken(env);
  const url = `${QQ_API_BASE}/v2/users/${openid}/messages`;

  const body: Record<string, unknown> = {
    content,
    msg_type: 0,
  };
  if (msgId) body.msg_id = msgId;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `QQBot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send private message: ${error}`);
  }
}

// 发送群消息
export async function sendGroupMessage(
  env: Env,
  groupOpenid: string,
  content: string,
  msgId?: string
): Promise<void> {
  const token = await getAccessToken(env);
  const url = `${QQ_API_BASE}/v2/groups/${groupOpenid}/messages`;

  const body: Record<string, unknown> = {
    content,
    msg_type: 0,
  };
  if (msgId) body.msg_id = msgId;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `QQBot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send group message: ${error}`);
  }
}

// 根据事件类型发送回复
export async function sendReply(
  env: Env,
  event: QQWebhookEvent,
  content: string
): Promise<void> {
  if (isGroupMessage(event)) {
    await sendGroupMessage(env, getGroupId(event)!, content, event.id);
  } else {
    await sendPrivateMessage(env, getSenderId(event), content, event.id);
  }
}
