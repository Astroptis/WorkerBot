import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, tool } from 'ai';
import { z } from 'zod';

const provider = createOpenAICompatible({
  name: 'bai',
  baseURL: 'https://api.b.ai/v1',
  apiKey: 'sk-12xmjqe6mk2qfn6lfghm8qvowmnq35ml',
});

const result = await generateText({
  model: provider('deepseek-v4-flash'),
  system: '你是一个智能助手，可以调用工具。当用户询问实时信息时调用 web_search 工具。',
  prompt: '张雪峰老师最近的情况',
  tools: {
    web_search: tool({
      description: '搜索互联网获取最新信息',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => '搜索结果：张雪峰最近很好',
    }),
  },
  maxOutputTokens: 2048,
});

console.log(JSON.stringify({ text: result.text, steps: result.steps.map(s => ({ tools: s.toolCalls?.map(t => ({ name: t.toolName, args: t.args })), text: s.text })) }, null, 2));