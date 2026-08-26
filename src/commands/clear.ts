import { Env } from '../types';
import { clearConversations } from '../db/d1';

export const clearCommand = {
  name: 'clear',
  description: '清空对话历史',
  handler: async (env: Env, userId: string): Promise<string> => {
    await clearConversations(env.DB, userId);
    return '对话历史已清空。';
  },
};
