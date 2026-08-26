import { Env } from './types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response('QQ Bot Worker - Coming Soon');
  },
};
