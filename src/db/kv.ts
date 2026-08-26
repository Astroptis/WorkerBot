// 管理员密码
export async function getAdminPassword(kv: KVNamespace): Promise<string | null> {
  return kv.get('admin:password');
}

export async function setAdminPassword(kv: KVNamespace, password: string): Promise<void> {
  await kv.put('admin:password', password);
}

// QQ 凭据
export interface QQCredentials {
  appId: string;
  appSecret: string;
}

export async function getQQCredentials(kv: KVNamespace): Promise<QQCredentials | null> {
  return kv.get('config:qq_credentials', 'json');
}

export async function setQQCredentials(kv: KVNamespace, credentials: QQCredentials): Promise<void> {
  await kv.put('config:qq_credentials', JSON.stringify(credentials));
}

// 系统设置
export interface SystemSettings {
  adminPassword: string;
  qqCredentials: QQCredentials | null;
  defaultModel: string;
  systemPrompt: string;
}

export async function getSystemSettings(kv: KVNamespace): Promise<SystemSettings> {
  return {
    adminPassword: (await kv.get('admin:password')) || '',
    qqCredentials: await getQQCredentials(kv),
    defaultModel: await getDefaultModel(kv),
    systemPrompt: await getSystemPrompt(kv),
  };
}

// API Key 管理
export interface ApiKeyConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
  createdAt: number;
}

export async function getApiKey(kv: KVNamespace, keyId: string): Promise<ApiKeyConfig | null> {
  return kv.get(`key:${keyId}`, 'json');
}

export async function setApiKey(kv: KVNamespace, config: ApiKeyConfig): Promise<void> {
  await kv.put(`key:${config.id}`, JSON.stringify(config));
  await refreshKeyList(kv);
}

export async function deleteApiKey(kv: KVNamespace, keyId: string): Promise<void> {
  await kv.delete(`key:${keyId}`);
  await refreshKeyList(kv);
}

export async function getAllKeys(kv: KVNamespace): Promise<ApiKeyConfig[]> {
  const cached = await kv.get<ApiKeyConfig[]>('key:list', 'json');
  if (cached) return cached;
  return refreshKeyList(kv);
}

async function refreshKeyList(kv: KVNamespace): Promise<ApiKeyConfig[]> {
  const list = await kv.list({ prefix: 'key:' });
  const keys: ApiKeyConfig[] = [];
  for (const key of list.keys) {
    if (key.name === 'key:list') continue;
    const config = await kv.get(key.name, 'json');
    if (config) keys.push(config as ApiKeyConfig);
  }
  await kv.put('key:list', JSON.stringify(keys), { expirationTtl: 300 });
  return keys;
}

export async function getEnabledKeys(kv: KVNamespace): Promise<ApiKeyConfig[]> {
  const all = await getAllKeys(kv);
  return all.filter(k => k.enabled);
}

// 默认模型
export async function getDefaultModel(kv: KVNamespace): Promise<string> {
  return (await kv.get('config:default_model')) || 'gpt-3.5-turbo';
}

export async function setDefaultModel(kv: KVNamespace, model: string): Promise<void> {
  await kv.put('config:default_model', model);
}

// 系统提示词
export async function getSystemPrompt(kv: KVNamespace): Promise<string> {
  return (await kv.get('config:system_prompt')) || '你是一个智能助手，通过 QQ 与用户对话。请用简洁、友好的方式回复。';
}

export async function setSystemPrompt(kv: KVNamespace, prompt: string): Promise<void> {
  await kv.put('config:system_prompt', prompt);
}

// 用户模型设置
export async function getUserModel(kv: KVNamespace, userId: string): Promise<string | null> {
  return kv.get(`user:model:${userId}`);
}

export async function setUserModel(kv: KVNamespace, userId: string, model: string): Promise<void> {
  await kv.put(`user:model:${userId}`, model);
}

// 限流
export async function checkRateLimit(kv: KVNamespace, userId: string, limit = 10): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:${userId}`;
  const current = await kv.get(key, 'json') as { count: number } | null;
  if (!current) {
    await kv.put(key, JSON.stringify({ count: 1 }), { expirationTtl: 60 });
    return { allowed: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  current.count++;
  await kv.put(key, JSON.stringify(current), { expirationTtl: 60 });
  return { allowed: true, remaining: limit - current.count };
}

// QQ Token
export async function getQQAccessToken(kv: KVNamespace): Promise<string | null> {
  return kv.get('qq:access_token');
}

export async function setQQAccessToken(kv: KVNamespace, token: string, expiresIn: number): Promise<void> {
  await kv.put('qq:access_token', token, { expirationTtl: expiresIn - 60 });
}
