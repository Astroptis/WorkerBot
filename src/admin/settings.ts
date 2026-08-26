import { Env } from '../types';
import { getSystemSettings, setQQCredentials, setDefaultModel, setSystemPrompt, getAdminPassword, setAdminPassword, QQCredentials } from '../db/kv';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleGetSettings(env: Env): Promise<Response> {
  const settings = await getSystemSettings(env.KV);
  return jsonResponse({
    qqConfigured: !!settings.qqCredentials,
    qqAppId: settings.qqCredentials?.appId || '',
    defaultModel: settings.defaultModel,
    systemPrompt: settings.systemPrompt,
  });
}

export async function handleUpdateSettings(env: Env, body: {
  qqAppId?: string;
  qqAppSecret?: string;
  defaultModel?: string;
  systemPrompt?: string;
  newPassword?: string;
}): Promise<Response> {
  // 更新 QQ 凭据
  if (body.qqAppId !== undefined && body.qqAppSecret !== undefined) {
    const credentials: QQCredentials = {
      appId: body.qqAppId,
      appSecret: body.qqAppSecret,
    };
    await setQQCredentials(env.KV, credentials);
  }

  // 更新默认模型
  if (body.defaultModel) {
    await setDefaultModel(env.KV, body.defaultModel);
  }

  // 更新系统提示词
  if (body.systemPrompt !== undefined) {
    await setSystemPrompt(env.KV, body.systemPrompt);
  }

  // 更新管理员密码
  if (body.newPassword) {
    const encoder = new TextEncoder();
    const data = encoder.encode(body.newPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    await setAdminPassword(env.KV, hash);
  }

  return jsonResponse({ success: true });
}
