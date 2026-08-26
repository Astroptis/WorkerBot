import { Env } from '../types';
import { ChatMessage, ChatCompletionResponse } from './types';
import { selectApiKey } from './keys';

const SYSTEM_PROMPT = `你是一个智能助手，通过 QQ 与用户对话。请用简洁、友好的方式回复。`;

export async function chat(
  env: Env,
  userId: string,
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const keyConfig = await selectApiKey(env);
  const useModel = model || keyConfig.model;

  const response = await fetch(`${keyConfig.endpoint}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${keyConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: useModel,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error: ${error}`);
  }

  const data = await response.json() as ChatCompletionResponse;
  return data.choices[0]?.message?.content || '抱歉，我无法生成回复。';
}

export async function generateSummary(
  env: Env,
  messages: ChatMessage[]
): Promise<string> {
  const keyConfig = await selectApiKey(env);

  const prompt: ChatMessage[] = [
    { role: 'system', content: '请将以下对话压缩为一段简明摘要，保留关键信息。' },
    { role: 'user', content: messages.map(m => `${m.role}: ${m.content}`).join('\n') },
  ];

  const response = await fetch(`${keyConfig.endpoint}/v1/chat/completions`, {
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
