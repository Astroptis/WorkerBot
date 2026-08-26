import { Env } from '../types';
import { getDefaultModel, getUserModel, setUserModel } from '../db/kv';

export const modelCommand = {
  name: 'model',
  description: '查看/切换模型',
  handler: async (env: Env, userId: string, args: string): Promise<string> => {
    if (!args.trim()) {
      const current = await getUserModel(env.KV, userId) || await getDefaultModel(env.KV);
      return `当前模型：${current}\n使用 /model [模型名] 切换模型。`;
    }
    await setUserModel(env.KV, userId, args.trim());
    return `模型已切换为：${args.trim()}`;
  },
};
