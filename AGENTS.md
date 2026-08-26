# QQ Bot Worker 项目规则

## 环境与凭据
- 平台：Cloudflare Workers + D1 + KV
- 域名：`https://bot.astroptis.dpdns.org`（自定义域名，QQ 平台拒绝 `.workers.dev` 域名）
- Webhook URL：`https://bot.astroptis.dpdns.org/api/webhook`
- QQ AppID：`1905493443`
- AppSecret 存于 KV `config:qq_credentials`（会变动，通过管理面板设置，不要硬编码）
- 管理面板密码：`tianlu4.5`（首次登录设置）
- AI 后端：b.ai，endpoint `https://api.b.ai`，模型 `deepseek-v4-flash`（KV 中配置）

## 关键 API 要点
- **QQ access_token 端点**：`https://api.bot.qq.com/app/getAppAccessToken`（不是 `bots.qq.com`，那是错的）
- **access_token 成功响应**：`{"access_token":"...","expires_in":3815}` — 无 `code` 字段；失败才是 `{"code":100002,"message":"internal err"}`。判断成功用 `data.access_token` 是否存在，不要用 `code !== 0`（成功时 code 是 undefined）
- **发送消息 API**：`https://api.bot.qq.com/v2/users/{openid}/messages`，Authorization 头 `QQBot {token}`
- **webhook 事件字段**：事件类型用 `t`（不是 `type`），数据在 `d`（不是 `raw`）
  - `d.content` 消息文本，`d.author.user_openid` 发送者，`d.id` 消息ID（`ROBOT1.0_...`）
  - 顶层 `id` 是 `C2C_MESSAGE_CREATE:...`，**不能**作为 msg_id 发送
- **Webhook 回调验证**：请求 `{"d":{"plain_token":"...","event_ts":"..."},"op":13}`，返回 `{"plain_token":"...","signature":"..."}`
- **Ed25519 签名**：secret 重复填充到 32 字节作为种子，签名 `event_ts + plain_token`。必须用 `tweetnacl`（Web Crypto 的 Ed25519 与 Go 签名不一致）；Go 参考 `ed25519.GenerateKey(strings.NewReader(seed))` + `ed25519.Sign`，tweetnacl 输出与 Go 完全一致

## Cloudflare Workers 注意事项
- 免费计划有冷启动：低活跃时首个请求慢 ~5s，cron `*/1 * * * *` 保活可缓解（已配置）
- `wrangler kv key get` / `wrangler tail` 在本机 Windows 会崩溃（access violation），用管理面板 API 代替
- PowerShell 不支持 `&&`，用 `;`
- 查询/删除 D1 远程库：`wrangler d1 execute qq-bot-db --remote --command "SQL"`（单条语句，不能多条）
- Windows curl 发送 JSON 到 QQ token 接口会报 `100002`，用 Node.js 或 Worker fetch 测试

## 部署与仓库
- 部署：`wrangler deploy`（项目目录 `C:\Users\wang\qq-bot-worker`）
- GitHub 仓库：`Astroptis/WorkerBot`
- 管理面板：`https://bot.astroptis.dpdns.org/`
- 测试消息：POST 到 `/api/webhook`，body 用 `t`/`d` 字段格式，openid 用 `46BD04B2B0B12C2485CCDB9FCF5F6394`（真实用户，能触发真回复）
