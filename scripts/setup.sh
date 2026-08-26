#!/bin/bash
set -e

echo "=== QQ Bot Worker Setup ==="
echo ""

# 检查 wrangler 是否可用
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler not found. Run: npm install"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "Error: Not logged in. Run: wrangler login"
    exit 1
fi

# 创建 D1 数据库（如果还没有）
if grep -q 'YOUR_D1_DATABASE_ID' wrangler.toml; then
    echo "Creating D1 database..."
    DB_OUTPUT=$(wrangler d1 create qq-bot-db 2>&1)
    echo "$DB_OUTPUT"

    DB_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+')
    if [ -z "$DB_ID" ]; then
        echo "Error: Failed to get D1 database ID"
        exit 1
    fi

    sed -i "s/YOUR_D1_DATABASE_ID/$DB_ID/" wrangler.toml
    echo "D1 database ID: $DB_ID"
else
    echo "D1 database already configured"
fi

# 创建 KV 命名空间（如果还没有）
if grep -q 'YOUR_KV_NAMESPACE_ID' wrangler.toml; then
    echo "Creating KV namespace..."
    KV_OUTPUT=$(wrangler kv namespace create KV 2>&1)
    echo "$KV_OUTPUT"

    KV_ID=$(echo "$KV_OUTPUT" | grep -oP 'id = "\K[^"]+')
    if [ -z "$KV_ID" ]; then
        echo "Error: Failed to get KV namespace ID"
        exit 1
    fi

    sed -i "s/YOUR_KV_NAMESPACE_ID/$KV_ID/" wrangler.toml
    echo "KV namespace ID: $KV_ID"
else
    echo "KV namespace already configured"
fi

# 初始化数据库表
echo ""
echo "Initializing database tables..."
wrangler d1 execute qq-bot-db --file=./src/db/schema.sql --remote
echo ""

echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Deploy:  npm run deploy"
echo "  2. Open:    https://your-worker.workers.dev"
echo "  3. Set QQ credentials in admin panel"
