import { Env } from '../types';
import { processMessage } from '../ai/history';

export const chatCommand = {
  name: 'chat',
  description: '显式对话',
  handler: async (env: Env, userId: string, args: string): Promise<string> => {
    if (!args.trim()) {
      return '请输入对话内容，例如：/chat 你好';
    }
    return processMessage(env, userId, args.trim());
  },
};
