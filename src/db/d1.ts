export interface User {
  user_id: string;
  nickname: string | null;
  created_at: number;
  updated_at: number;
  settings: string;
}

export interface Conversation {
  id: number;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
  is_summary: number;
}

export interface Summary {
  id: number;
  user_id: string;
  summary: string;
  msg_count: number;
  created_at: number;
}

// 用户操作
export async function getOrCreateUser(db: D1Database, userId: string, nickname?: string): Promise<User> {
  const existing = await db.prepare('SELECT * FROM users WHERE user_id = ?').bind(userId).first<User>();
  if (existing) {
    if (nickname && existing.nickname !== nickname) {
      await db.prepare('UPDATE users SET nickname = ?, updated_at = unixepoch() WHERE user_id = ?')
        .bind(nickname, userId).run();
      existing.nickname = nickname;
    }
    return existing;
  }
  await db.prepare('INSERT INTO users (user_id, nickname) VALUES (?, ?)').bind(userId, nickname || null).run();
  return { user_id: userId, nickname: nickname || null, created_at: Date.now(), updated_at: Date.now(), settings: '{}' };
}

export async function getUser(db: D1Database, userId: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE user_id = ?').bind(userId).first<User>();
}

export async function getAllUsers(db: D1Database, limit = 50, offset = 0): Promise<User[]> {
  return db.prepare('SELECT * FROM users ORDER BY updated_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all<User>().then(r => r.results);
}

export async function updateUserSettings(db: D1Database, userId: string, settings: Record<string, unknown>): Promise<void> {
  await db.prepare('UPDATE users SET settings = ?, updated_at = unixepoch() WHERE user_id = ?')
    .bind(JSON.stringify(settings), userId).run();
}

// 对话历史操作
export async function addConversation(db: D1Database, userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
  await db.prepare('INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)')
    .bind(userId, role, content).run();
}

// 一次查询：最新摘要 + 近期对话（减少往返）
export async function getContextData(db: D1Database, userId: string, limit = 20): Promise<{
  summary: Summary | null;
  recent: Conversation[];
}> {
  const [summaryResult, recentResult] = await db.batch([
    db.prepare('SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(userId),
    db.prepare(
      'SELECT * FROM conversations WHERE user_id = ? AND is_summary = 0 ORDER BY created_at DESC LIMIT ?'
    ).bind(userId, limit),
  ]);
  const summary = (summaryResult.results[0] as Summary) || null;
  const recent = (recentResult.results as Conversation[]).reverse();
  return { summary, recent };
}

export async function getRecentConversations(db: D1Database, userId: string, limit = 20): Promise<Conversation[]> {
  return db.prepare(
    'SELECT * FROM conversations WHERE user_id = ? AND is_summary = 0 ORDER BY created_at DESC LIMIT ?'
  ).bind(userId, limit).all<Conversation>().then(r => r.results.reverse());
}

export async function getUncompressedCount(db: D1Database, userId: string): Promise<number> {
  const result = await db.prepare(
    'SELECT COUNT(*) as count FROM conversations WHERE user_id = ? AND is_summary = 0'
  ).bind(userId).first<{ count: number }>();
  return result?.count || 0;
}

export async function markAsCompressed(db: D1Database, userId: string, upToId: number): Promise<void> {
  await db.prepare('UPDATE conversations SET is_summary = 1 WHERE user_id = ? AND id <= ? AND is_summary = 0')
    .bind(userId, upToId).run();
}

export async function clearConversations(db: D1Database, userId: string): Promise<void> {
  await db.prepare('DELETE FROM conversations WHERE user_id = ?').bind(userId).run();
  await db.prepare('DELETE FROM summaries WHERE user_id = ?').bind(userId).run();
}

// 清空所有用户的聊天记录
export async function clearAllConversations(db: D1Database): Promise<void> {
  await db.prepare('DELETE FROM conversations').run();
  await db.prepare('DELETE FROM summaries').run();
}

// 摘要操作
export async function getLatestSummary(db: D1Database, userId: string): Promise<Summary | null> {
  return db.prepare('SELECT * FROM summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(userId).first<Summary>();
}

export async function addSummary(db: D1Database, userId: string, summary: string, msgCount: number): Promise<void> {
  await db.prepare('INSERT INTO summaries (user_id, summary, msg_count) VALUES (?, ?, ?)')
    .bind(userId, summary, msgCount).run();
}

export async function getUserConversations(db: D1Database, userId: string, limit = 50, offset = 0): Promise<Conversation[]> {
  return db.prepare(
    'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(userId, limit, offset).all<Conversation>().then(r => r.results);
}

export async function getUserCount(db: D1Database): Promise<number> {
  const result = await db.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  return result?.count || 0;
}
