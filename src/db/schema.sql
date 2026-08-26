-- 用户画像表
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  nickname TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  settings TEXT DEFAULT '{}'
);

-- 对话历史表
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  is_summary INTEGER DEFAULT 0
);

-- 摘要记录表
CREATE TABLE IF NOT EXISTS summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  msg_count INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_summary ON conversations(user_id, is_summary);
CREATE INDEX IF NOT EXISTS idx_sum_user ON summaries(user_id);
