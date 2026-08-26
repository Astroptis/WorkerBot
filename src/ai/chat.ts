import { Env } from '../types';
import { ChatMessage, ChatCompletionResponse } from './types';
import { selectApiKey } from './keys';
import { getSystemPrompt } from '../db/kv';

export async function chat(
  env: Env,
  userId: string,
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const keyConfig = await selectApiKey(env);
  const useModel = model || keyConfig.model;
  const systemPrompt = await getSystemPrompt(env.KV);

  // 构建完整 URL：如果 endpoint 已经包含 /chat/completions 则直接使用，否则拼接
  let url = keyConfig.endpoint;
  if (!url.includes('/chat/completions')) {
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.endsWith('/v1')) url += '/v1';
    url += '/chat/completions';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keyConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: useModel,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${response.status} ${error}`);
  }

  const data = await response.json() as ChatCompletionResponse;
  return data.choices[0]?.message?.content || '抱歉，我无法生成回复。';
}

export async function generateSummary(
  env: Env,
  messages: ChatMessage[]
): Promise<string> {
  const keyConfig = await selectApiKey(env);

  let url = keyConfig.endpoint;
  if (!url.includes('/chat/completions')) {
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.endsWith('/v1')) url += '/v1';
    url += '/chat/completions';
  }

  const prompt: ChatMessage[] = [
    { role: 'system', content: '请将以下对话压缩为一段简明摘要，保留关键信息。' },
    { role: 'user', content: messages.map(m => `${m.role}: ${m.content}`).join('\n') },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keyConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: keyConfig.model,
      messages: prompt,
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary');
  }

  const data = await response.json() as ChatCompletionResponse;
  return data.choices[0]?.message?.content || '';
}
