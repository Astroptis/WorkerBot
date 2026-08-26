import { AnySearchResponse, AnySearchResult } from './types';

const ANYSEARCH_API = 'https://api.anysearch.com/v1/search';

// 需要实时/最新信息的搜索意图关键词
const SEARCH_TRIGGER_PATTERN =
  /天气|气温|新闻|最新|今天|明天|实时|股票|股价|价格|汇率|比赛|比分|热点|热搜|科技|发布|上市|多少(钱|元)|查询|搜索|查找|了解|介绍|是什么|怎么回事|发生了什么|政策|新规|油价|金价|房价|比特币|加密货币|明星|电影|电视剧|游戏|攻略|教程|怎么|如何/g;

// 判断用户消息是否需要联网搜索
export function needsSearch(text: string): boolean {
  return SEARCH_TRIGGER_PATTERN.test(text);
}

// 从用户消息提取搜索关键词（去掉废话，保留核心）
export function extractSearchQuery(text: string): string {
  // 去掉常见提问语气词
  const cleaned = text
    .replace(/请|帮我|麻烦|一下|能不能|可以|吗|呢|啊|呀|吧/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 100);
}

// 调用 AnySearch 搜索
export async function webSearch(
  query: string,
  maxResults = 5
): Promise<AnySearchResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(ANYSEARCH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Anysearch-Client': 'qq-bot/1.0.0',
      },
      body: JSON.stringify({
        query,
        max_results: Math.min(Math.max(maxResults, 1), 10),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AnySearch error: ${response.status}`);
    }

    const data = await response.json() as AnySearchResponse;
    if (data.code !== 0) {
      throw new Error(`AnySearch error: ${data.message}`);
    }

    return data.data.results || [];
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('搜索超时');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
