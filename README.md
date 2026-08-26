# QQ Bot Worker

基于 Cloudflare Worker 的 QQ 官方机器人聊天服务，支持 AI 对话、指令系统和 Web 管理控制台。

## 功能

- AI 对话（OpenAI 兼容 API，多 Key 轮转）
- 对话历史管理（近期缓存 + 摘要压缩）
- 指令系统：`/help` `/chat` `/clear` `/model` `/info`
- Web 管理控制台：API Key 管理、用户管理、对话记录、系统设置
- 敏感配置存 KV，不暴露到代码仓库

## 部署方式一：本地 CLI 部署（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/Astroptis/WorkerBot.git
cd WorkerBot

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
wrangler login

# 4. 一键部署（自动创建 D1/KV 并部署）
npm run deploy
```

## 部署方式二：GitHub + Cloudflare Pages 集成

### 前置准备

1. Fork 本仓库到你的 GitHub 账号

2. 登录 Cloudflare 控制台，手动创建资源：

   **创建 D1 数据库：**
   - 进入 Workers & Pages > D1 > 创建数据库
   - 名称随意（如 `qq-bot-db`）
   - 创建后复制 `database_id`

   **创建 KV 命名空间：**
   - 进入 Workers & Pages > KV > 创建命名空间
   - 名称随意（如 `KV`）
   - 创建后复制 `id`

3. 在你的 Fork 仓库中更新 `wrangler.toml`：

   ```toml
   database_id = "粘贴你的 D1 database_id"
   id = "粘贴你的 KV namespace id"
   ```

4. 连接 Cloudflare 部署：
   - Workers & Pages > 创建应用程序 > 连接 GitHub 仓库
   - 选择你的 Fork 仓库
   - 构建命令留空（或填 `npm run deploy`）
   - 部署即可

5. 部署后访问 Worker URL，进入控制台配置 QQ 凭据

## 使用

1. 部署后访问 Worker URL
2. 首次登录**任意输入密码**（这是你的管理员密码，务必记住）
3. 进入「系统设置」，填入 QQ App ID 和 App Secret
4. 进入「API Key 管理」，添加 OpenAI 兼容的 API Key
5. 在 QQ 开放平台配置 Webhook URL：`https://your-worker.workers.dev/api/webhook`

## 指令

| 指令 | 功能 |
|------|------|
| `/help` | 显示帮助 |
| `/chat [内容]` | 显式对话 |
| `/clear` | 清空对话历史 |
| `/model [名称]` | 切换模型 |
| `/info` | 查看用户信息 |

## 技术栈

- Cloudflare Worker (TypeScript)
- Cloudflare D1 (SQLite)
- Cloudflare KV
- OpenAI 兼容 API
- 原生 HTML/CSS/JS 控制台
