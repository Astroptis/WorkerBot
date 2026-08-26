import { Env } from '../types';
import { ChatMessage, ChatCompletionResponse } from './types';
import { selectApiKey } from './keys';
import { getSystemPrompt } from '../db/kv';
import { needsSearch, extractSearchQuery, webSearch, formatSearchResults } from './tools';

// 自定义超时
function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error(`AI fetch timeout after ${ms}ms`)), ms)),
  ]);
}

async function callOnce(
  url: string,
  keyConfig: { apiKey: string; model: string },
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<ChatCompletionResponse> {
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keyConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: keyConfig.model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  }, 30000);

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status} ${responseText}`);
  }

  return JSON.parse(responseText) as ChatCompletionResponse;
}

export async function chat(
  env: Env,
  userId: string,
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const keyConfig = await selectApiKey(env);
  const useModel = model || keyConfig.model;
  const systemPrompt = await getSystemPrompt(env.KV);

  // 构建完整 URL
  let url = keyConfig.endpoint;
  if (!url.includes('/chat/completions')) {
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.endsWith('/v1')) url += '/v1';
    url += '/chat/completions';
  }

  // 检测最后一条用户消息是否需要搜索
  const lastUserMsg = messages.filter(m => m.role === 'user').pop();
  let searchResult = '';
  if (lastUserMsg?.content && needsSearch(lastUserMsg.content)) {
    const query = extractSearchQuery(lastUserMsg.content);
    try {
      const results = await webSearch(query);
      searchResult = `\n\n【联网搜索结果】\n${formatSearchResults(results)}\n\n请基于以上搜索结果回答用户的问题。如果搜索结果与问题无关，请忽略。`;
    } catch (e: any) {
      searchResult = '\n\n【联网搜索失败，请基于你的知识回答】';
    }
  }

  // 第一次尝试
  try {
    const data = await callOnce(url, { apiKey: keyConfig.apiKey, model: useModel }, systemPrompt + searchResult, messages);
    return data.choices[0]?.message?.content || '抱歉，我无法生成回复。';
  } catch (error: any) {
    // 第二次重试（不带搜索结果）
    try {
      const data = await callOnce(url, { apiKey: keyConfig.apiKey, model: useModel }, systemPrompt, messages);
      return data.choices[0]?.message?.content || '抱歉，我无法生成回复。';
    } catch (error2: any) {
      throw error2;
    }
  }
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