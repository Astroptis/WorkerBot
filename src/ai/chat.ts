import { Env } from '../types';
import { ChatMessage, ChatCompletionResponse } from './types';
import { selectApiKey } from './keys';
import { getSystemPrompt } from '../db/kv';
import { webSearch, formatSearchResults } from './tools';

function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  return Promise.race([fetch(url, options), new Promise<Response>((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms))]);
}

export async function chat(
  env: Env,
  userId: string,
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const keyConfig = await selectApiKey(env);
  const useModel = model || keyConfig.model;
  const basePrompt = await getSystemPrompt(env.KV);

  let url = keyConfig.endpoint;
  if (!url.includes('/chat/completions')) {
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.endsWith('/v1')) url += '/v1';
    url += '/chat/completions';
  }

  // 两阶段：AI 决策是否搜索（max_tokens 要足够，否则推理模型被截断在 reasoning 阶段）
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  let searchResult = '';
  let searched = false;
  try {
    const decisionResponse = await fetchWithTimeout(url, {
      method: 'POST', headers: { 'Authorization': `Bearer ${keyConfig.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: useModel, temperature: 0, max_tokens: 100,
        messages: [{
          role: 'system',
          content: `${basePrompt}\n\n你具备联网搜索能力。判断用户问题是否需要最新/实时信息（天气、新闻、股票、价格、人物近况、事件等）。\n- 需要则 ONLY 输出：SEARCH\n- 不需要则 ONLY 输出：NO`
        }, ...messages],
      }),
    }, 8000);
    const data = await decisionResponse.json().catch(() => null);
    const txt = data?.choices?.[0]?.message?.content || '';
    if (txt.includes('SEARCH') && !txt.includes('NO')) {
      const results = await webSearch(lastUserMsg, 5);
      if (results.length > 0) {
        searchResult = `\n\n【联网搜索结果】\n${formatSearchResults(results)}\n\n请基于以上搜索结果回答。在回复中引用来源。如果搜索结果与问题无关请忽略。`;
        searched = true;
      }
    }
  } catch {}

  const systemPrompt = searched
    ? `${basePrompt}${searchResult}`
    : `${basePrompt}\n\n你具备联网搜索能力。当用户问实时信息时系统会自动搜索。如果用户问你是否能联网，回答你可以。`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST', headers: { 'Authorization': `Bearer ${keyConfig.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: useModel, temperature: 0.7, max_tokens: 2048, messages: [{ role: 'system', content: systemPrompt }, ...messages] }),
    }, 15000);
    const txt = await response.text();
    if (!response.ok) throw new Error(`AI error: ${response.status} ${txt}`);
    return (JSON.parse(txt) as ChatCompletionResponse).choices[0]?.message?.content || '抱歉，无法生成回复。';
  } catch (error: any) {
    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST', headers: { 'Authorization': `Bearer ${keyConfig.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: useModel, messages: [{ role: 'system', content: basePrompt }, ...messages], temperature: 0.7, max_tokens: 2048 }),
      }, 15000);
      const txt = await response.text();
      if (!response.ok) throw new Error(`AI error: ${response.status} ${txt}`);
      return (JSON.parse(txt) as ChatCompletionResponse).choices[0]?.message?.content || '抱歉，无法生成回复。';
    } catch (error2: any) { throw error2; }
  }
}

export async function generateSummary(env: Env, messages: ChatMessage[]): Promise<string> {
  const keyConfig = await selectApiKey(env);
  let url = keyConfig.endpoint;
  if (!url.includes('/chat/completions')) {
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.endsWith('/v1')) url += '/v1';
    url += '/chat/completions';
  }
  const response = await fetch(url, {
    method: 'POST', headers: { 'Authorization': `Bearer ${keyConfig.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: keyConfig.model, messages: [{ role: 'system', content: '请将以下对话压缩为一段简明摘要。' }, { role: 'user', content: messages.map(m => `${m.role}: ${m.content}`).join('\n') }], temperature: 0.3, max_tokens: 512 }),
  });
  if (!response.ok) throw new Error('Failed to generate summary');
  return (await response.json() as ChatCompletionResponse).choices[0]?.message?.content || '';
}