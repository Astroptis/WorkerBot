export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  QQ_APP_ID: string;
  QQ_APP_SECRET: string;
  ADMIN_INIT_PASSWORD: string;
}

export interface RequestContext {
  env: Env;
  request: Request;
  url: URL;
}
