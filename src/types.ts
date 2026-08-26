export interface Env {
  DB: D1Database;
  KV: KVNamespace;
}

export interface RequestContext {
  env: Env;
  request: Request;
  url: URL;
}
