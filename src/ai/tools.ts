import { AnySearchResponse, AnySearchResult, ToolDefinition } from './types';

const ANYSEARCH_API = 'https://api.anysearch.com/v1/search';

// 搜索工具定义（用于 function calling）
export const SEARCH_TOOL: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      '搜索互联网获取最新信息。当用户询问实时信息（天气、新闻、最新动态、价格、股票、人物近况、事件等）时使用。返回搜索结果的标题、链接和摘要。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '要搜索的关键词或自然语言查询，例如"北京今天天气"或"某人物最新动态"',
        },
        max_results: {
          type: 'integer',
          description: '返回结果数量，1-10，默认 5',
        },
      },
      required: ['query'],
    },
  },
};

// 调用 AnySearch 搜索
export async function webSearch(
  query: string,
  maxResults = 5
): Promise<AnySearchResult[]> {
  // 用 Promise.race 实现超时（避免 AbortController 在 CF Workers 的兼容问题）
  const doFetch = fetch(ANYSEARCH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Anysearch-Client': 'qq-bot/1.0.0',
    },
    body: JSON.stringify({
      query,
      max_results: Math.min(Math.max(maxResults, 1), 10),
    }),
  });

  const response = await Promise.race([
    doFetch,
    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('搜索超时')), 15000)),
  ]);

  if (!response.ok) {
    throw new Error(`AnySearch error: ${response.status}`);
  }

  const data = await response.json() as AnySearchResponse;
  if (data.code !== 0) {
    throw new Error(`AnySearch error: ${data.message}`);
  }

  return data.data.results || [];
}

// 将搜索结果格式化为 AI 可读的文本
export function formatSearchResults(results: AnySearchResult[]): string {
  if (results.length === 0) {
    return '没有找到相关搜索结果。';
  }
  return results
    .map((r, i) => {
      const title = r.title || '无标题';
      const url = r.url || '';
      const snippet = r.snippet || r.content || '';
      return `${i + 1}. ${title}\n   链接: ${url}\n   摘要: ${snippet.slice(0, 300)}`;
    })
    .join('\n\n');
}
