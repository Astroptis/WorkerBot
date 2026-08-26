import { Env } from '../types';
import { ChatMessage } from './types';
import {
  getRecentConversations,
  getLatestSummary,
  addConversation,
  getUncompressedCount,
  addSummary,
  markAsCompressed,
} from '../db/d1';
import { chat, generateSummary } from './chat';

const CACHE_WINDOW = 20;
const COMPRESS_THRESHOLD = 40;
const COMPRESS_BATCH = 20;

// 构建对话上下文
export async function buildContext(env: Env, userId: string): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];

  // 加载最新摘要
  const summary = await getLatestSummary(env.DB, userId);
  if (summary) {
    messages.push({ role: 'system', content: `历史对话摘要：${summary.summary}` });
  }

  // 加载近期对话
  const recent = await getRecentConversations(env.DB, userId, CACHE_WINDOW);
  for (const conv of recent) {
    messages.push({ role: conv.role, content: conv.content });
  }

  return messages;
}

// 处理用户消息并生成回复
export async function processMessage(
  env: Env,
  userId: string,
  userMessage: string
): Promise<string> {
  // 记录用户消息
  await addConversation(env.DB, userId, 'user', userMessage);

  // 构建上下文
  const context = await buildContext(env, userId);

  // 调用 AI
  const reply = await chat(env, userId, [...context, { role: 'user', content: userMessage }]);

  // 记录助手回复
  await addConversation(env.DB, userId, 'assistant', reply);

  // 检查是否需要压缩
  const uncompressedCount = await getUncompressedCount(env.DB, userId);
  if (uncompressedCount >= COMPRESS_THRESHOLD) {
    compressHistory(env, userId).catch(console.error);
  }

  return reply;
}

// 压缩历史对话
async function compressHistory(env: Env, userId: string): Promise<void> {
  const recent = await getRecentConversations(env.DB, userId, COMPRESS_BATCH);
  if (recent.length === 0) return;

  const summary = await generateSummary(env, recent.map(c => ({
    role: c.role as 'user' | 'assistant',
    content: c.content,
  })));

  await addSummary(env.DB, userId, summary, recent.length);
  await markAsCompressed(env.DB, userId, recent[recent.length - 1].id);
}
