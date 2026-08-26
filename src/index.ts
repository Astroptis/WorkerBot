import { Env } from './types';
import { handleWebhook } from './qq/webhook';
import { handleLogin, verifyAuth } from './admin/auth';
import { handleGetKeys, handleCreateKey, handleUpdateKey, handleDeleteKey } from './admin/keys';
import { handleGetUsers, handleGetUser, handleGetUserConversations } from './admin/users';
import { handleGetSettings, handleUpdateSettings } from './admin/settings';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      // QQ Webhook (POST)
      if (path === '/api/webhook' && request.method === 'POST') {
        return handleWebhook(env, request, ctx);
      }

      // QQ 可能先发 GET 测试可达性
      if (path === '/api/webhook') {
        return new Response('OK', { headers: { 'Content-Type': 'text/plain' } });
      }

      // 健康检查
      if (path === '/health') {
        return new Response(JSON.stringify({ ok: true, ts: Date.now() }), { headers: { 'Content-Type': 'application/json' } });
      }

      // 管理 API
      if (path.startsWith('/api/admin/')) {
        return handleAdminApi(env, request, url);
      }

      // 前端静态资源
      if (path === '/' || path === '/index.html') {
        return new Response(HTML_CONTENT, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
      if (path === '/app.js') {
        return new Response(JS_CONTENT, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
      }
      if (path === '/style.css') {
        return new Response(CSS_CONTENT, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },

  // 定时任务：保持 Worker 活跃
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // 预热，减少冷启动延迟
  },
};

async function handleAdminApi(env: Env, request: Request, url: URL): Promise<Response> {
  const path = url.pathname;
  const method = request.method;

  // 登录（不需要认证）
  if (path === '/api/admin/login' && method === 'POST') {
    const body = await request.json() as { password: string };
    return handleLogin(env, body);
  }

  // 其他管理 API 需要认证
  if (!await verifyAuth(env, request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // API Key 管理
  if (path === '/api/admin/keys') {
    if (method === 'GET') return handleGetKeys(env);
    if (method === 'POST') {
      const body = await request.json() as any;
      return handleCreateKey(env, body);
    }
  }

  if (path.match(/^\/api\/admin\/keys\/[^/]+$/)) {
    const keyId = path.split('/').pop()!;
    if (method === 'PUT') {
      const body = await request.json() as any;
      return handleUpdateKey(env, keyId, body);
    }
    if (method === 'DELETE') return handleDeleteKey(env, keyId);
  }

  // 用户管理
  if (path === '/api/admin/users' && method === 'GET') {
    return handleGetUsers(env, url);
  }

  if (path.match(/^\/api\/admin\/users\/[^/]+$/) && method === 'GET') {
    const userId = path.split('/').pop()!;
    return handleGetUser(env, userId);
  }

  if (path.match(/^\/api\/admin\/users\/[^/]+\/conversations$/) && method === 'GET') {
    const userId = path.split('/').slice(-2, -1)[0];
    return handleGetUserConversations(env, userId, url);
  }

  // 系统设置
  if (path === '/api/admin/settings') {
    if (method === 'GET') return handleGetSettings(env);
    if (method === 'POST') {
      const body = await request.json() as any;
      return handleUpdateSettings(env, body);
    }
  }

  return new Response('Not Found', { status: 404 });
}

// 前端内容（内联）
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QQ Bot 管理控制台</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="app">
    <div id="login-page" class="page active">
      <div class="login-box">
        <h1>QQ Bot 管理控制台</h1>
        <form id="login-form">
          <input type="password" id="password" placeholder="输入管理员密码" required>
          <button type="submit">登录</button>
        </form>
        <p id="login-error" class="error"></p>
      </div>
    </div>
    <div id="admin-page" class="page">
      <nav>
        <h2>QQ Bot 控制台</h2>
        <ul>
          <li><a href="#" data-tab="keys">API Key 管理</a></li>
          <li><a href="#" data-tab="users">用户管理</a></li>
          <li><a href="#" data-tab="conversations">对话记录</a></li>
          <li><a href="#" data-tab="settings">系统设置</a></li>
        </ul>
        <button id="logout-btn">退出</button>
      </nav>
      <main>
        <div id="tab-keys" class="tab active">
          <h3>API Key 管理</h3>
          <button id="add-key-btn">添加 Key</button>
          <div id="keys-list"></div>
        </div>
        <div id="tab-users" class="tab">
          <h3>用户管理</h3>
          <div id="users-list"></div>
        </div>
        <div id="tab-conversations" class="tab">
          <h3>对话记录</h3>
          <select id="user-select"><option value="">选择用户</option></select>
          <div id="conversations-list"></div>
        </div>
        <div id="tab-settings" class="tab">
          <h3>系统设置</h3>
          <form id="settings-form">
            <div class="form-group">
              <label>QQ App ID</label>
              <input type="text" id="qq-app-id" placeholder="QQ 开放平台 AppID">
            </div>
            <div class="form-group">
              <label>QQ App Secret</label>
              <input type="password" id="qq-app-secret" placeholder="QQ 开放平台 AppSecret">
            </div>
            <div class="form-group">
              <label>系统提示词</label>
              <textarea id="system-prompt" rows="4" placeholder="你是一个智能助手，通过 QQ 与用户对话。请用简洁、友好的方式回复。"></textarea>
            </div>
            <div class="form-group">
              <label>默认模型</label>
              <input type="text" id="default-model" placeholder="gpt-3.5-turbo">
            </div>
            <div class="form-group">
              <label>修改管理员密码（留空不修改）</label>
              <input type="password" id="new-password" placeholder="新密码">
            </div>
            <button type="submit">保存设置</button>
          </form>
          <p id="settings-msg" class="msg"></p>
        </div>
      </main>
    </div>
  </div>
  <div id="key-modal" class="modal">
    <div class="modal-content">
      <h3>添加 API Key</h3>
      <form id="key-form">
        <input type="text" id="key-name" placeholder="名称" required>
        <input type="text" id="key-endpoint" placeholder="API Endpoint" required>
        <input type="text" id="key-apikey" placeholder="API Key" required>
        <input type="text" id="key-model" placeholder="默认模型" required>
        <button type="submit">保存</button>
        <button type="button" id="cancel-key-btn">取消</button>
      </form>
    </div>
  </div>
  <script src="/app.js"></script>
</body>
</html>`;

const CSS_CONTENT = `*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;color:#333}
.page{display:none}.page.active{display:flex}
.login-box{margin:100px auto;padding:40px;background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,.1);max-width:400px}
.login-box h1{text-align:center;margin-bottom:20px}
.login-box input{width:100%;padding:10px;margin-bottom:10px;border:1px solid #ddd;border-radius:4px}
.login-box button{width:100%;padding:10px;background:#07c160;color:white;border:none;border-radius:4px;cursor:pointer}
.error{color:red;text-align:center;margin-top:10px}
nav{width:200px;background:white;padding:20px;min-height:100vh}
nav h2{font-size:16px;margin-bottom:20px}
nav ul{list-style:none}
nav li{margin-bottom:10px}
nav a{text-decoration:none;color:#666}
nav a:hover{color:#07c160}
nav a.active{color:#07c160;font-weight:bold}
main{flex:1;padding:20px}
.tab{display:none}.tab.active{display:block}
table{width:100%;border-collapse:collapse;background:white;border-radius:4px;overflow:hidden}
th,td{padding:10px 15px;text-align:left;border-bottom:1px solid #eee}
th{background:#f8f8f8}
button{padding:8px 16px;background:#07c160;color:white;border:none;border-radius:4px;cursor:pointer;margin-bottom:10px}
.modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5)}
.modal.active{display:flex;align-items:center;justify-content:center}
.modal-content{background:white;padding:30px;border-radius:8px;width:400px}
.modal-content input{width:100%;padding:10px;margin-bottom:10px;border:1px solid #ddd;border-radius:4px}
.modal-content button{margin-right:10px}
#logout-btn{margin-top:20px;background:#666}
.conversation-messages .message{padding:10px;margin:5px 0;border-radius:4px}
.conversation-messages .message.user{background:#e3f2fd}
.conversation-messages .message.assistant{background:#f3e5f5}
.form-group{margin-bottom:15px}
.form-group label{display:block;margin-bottom:5px;font-weight:bold}
.form-group input,.form-group textarea{width:100%;padding:10px;border:1px solid #ddd;border-radius:4px;font-family:inherit}
.form-group textarea{resize:vertical}
.msg{margin-top:10px;padding:10px;border-radius:4px;display:none}
.msg.success{display:block;background:#e8f5e9;color:#2e7d32}
.msg.error{display:block;background:#ffebee;color:#c62828}`;

const JS_CONTENT = `const API_BASE='/api/admin';let token=localStorage.getItem('admin_token');
document.getElementById('login-form').addEventListener('submit',async e=>{e.preventDefault();const p=document.getElementById('password').value;try{const r=await fetch(API_BASE+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p})});const d=await r.json();if(d.token){token=d.token;localStorage.setItem('admin_token',token);showAdminPage()}else{document.getElementById('login-error').textContent=d.error||'登录失败'}}catch(e){document.getElementById('login-error').textContent='网络错误'}});
function showAdminPage(){document.getElementById('login-page').classList.remove('active');document.getElementById('admin-page').classList.add('active');loadKeys()}
document.querySelectorAll('[data-tab]').forEach(t=>{t.addEventListener('click',e=>{e.preventDefault();document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));document.getElementById('tab-'+t.dataset.tab).classList.add('active');t.classList.add('active');if(t.dataset.tab==='users')loadUsers();if(t.dataset.tab==='conversations')loadUserSelect();if(t.dataset.tab==='settings')loadSettings()})});
async function api(p,o={}){const r=await fetch(API_BASE+p,{...o,headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,...o.headers}});return r.json()}
async function loadKeys(){const d=await api('/keys');const c=document.getElementById('keys-list');if(!d.keys?.length){c.innerHTML='<p>暂无 API Key</p>';return}c.innerHTML='<table><thead><tr><th>名称</th><th>Endpoint</th><th>模型</th><th>状态</th><th>操作</th></tr></thead><tbody>'+d.keys.map(k=>'<tr><td>'+k.name+'</td><td>'+k.endpoint+'</td><td>'+k.model+'</td><td>'+(k.enabled?'启用':'禁用')+'</td><td><button onclick="deleteKey(\\''+k.id+'\\')">删除</button></td></tr>').join('')+'</tbody></table>'}
document.getElementById('add-key-btn').addEventListener('click',()=>{document.getElementById('key-modal').classList.add('active')});
document.getElementById('cancel-key-btn').addEventListener('click',()=>{document.getElementById('key-modal').classList.remove('active')});
document.getElementById('key-form').addEventListener('submit',async e=>{e.preventDefault();await api('/keys',{method:'POST',body:JSON.stringify({name:document.getElementById('key-name').value,endpoint:document.getElementById('key-endpoint').value,apiKey:document.getElementById('key-apikey').value,model:document.getElementById('key-model').value,enabled:true})});document.getElementById('key-modal').classList.remove('active');loadKeys()});
window.deleteKey=async id=>{if(confirm('确定删除？')){await api('/keys/'+id,{method:'DELETE'});loadKeys()}};
async function loadUsers(){const d=await api('/users');const c=document.getElementById('users-list');if(!d.users?.length){c.innerHTML='<p>暂无用户</p>';return}c.innerHTML='<table><thead><tr><th>ID</th><th>昵称</th><th>注册时间</th><th>操作</th></tr></thead><tbody>'+d.users.map(u=>'<tr><td>'+u.user_id+'</td><td>'+(u.nickname||'-')+'</td><td>'+new Date(u.created_at*1000).toLocaleDateString('zh-CN')+'</td><td><button onclick="viewConversations(\\''+u.user_id+'\\')">查看对话</button></td></tr>').join('')+'</tbody></table>'}
async function loadUserSelect(){const d=await api('/users');document.getElementById('user-select').innerHTML='<option value="">选择用户</option>'+(d.users||[]).map(u=>'<option value="'+u.user_id+'">'+(u.nickname||u.user_id)+'</option>').join('')}
window.viewConversations=uid=>{document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));document.getElementById('tab-conversations').classList.add('active');document.getElementById('user-select').value=uid;loadConversations(uid)};
document.getElementById('user-select').addEventListener('change',e=>{if(e.target.value)loadConversations(e.target.value)});
async function loadConversations(uid){const d=await api('/users/'+uid+'/conversations');const c=document.getElementById('conversations-list');if(!d.conversations?.length){c.innerHTML='<p>暂无对话记录</p>';return}c.innerHTML='<div class="conversation-messages">'+d.conversations.map(c=>'<div class="message '+c.role+'"><strong>'+(c.role==='user'?'用户':'AI')+':</strong> '+c.content+'</div>').join('')+'</div>'}
document.getElementById('logout-btn').addEventListener('click',()=>{token=null;localStorage.removeItem('admin_token');document.getElementById('admin-page').classList.remove('active');document.getElementById('login-page').classList.add('active')});
async function loadSettings(){const d=await api('/settings');document.getElementById('qq-app-id').value=d.qqAppId||'';document.getElementById('default-model').value=d.defaultModel||'gpt-3.5-turbo';document.getElementById('system-prompt').value=d.systemPrompt||''}
document.getElementById('settings-form').addEventListener('submit',async e=>{e.preventDefault();const msg=document.getElementById('settings-msg');const body={};body.qqAppId=document.getElementById('qq-app-id').value;body.qqAppSecret=document.getElementById('qq-app-secret').value||undefined;body.defaultModel=document.getElementById('default-model').value;body.systemPrompt=document.getElementById('system-prompt').value;const pw=document.getElementById('new-password').value;if(pw)body.newPassword=pw;try{const r=await api('/settings',{method:'POST',body:JSON.stringify(body)});if(r.success){msg.textContent='设置已保存';msg.className='msg success';document.getElementById('new-password').value='';document.getElementById('qq-app-secret').value=''}else{msg.textContent=r.error||'保存失败';msg.className='msg error'}}catch(e){msg.textContent='网络错误';msg.className='msg error'}});
if(token)showAdminPage()`;
