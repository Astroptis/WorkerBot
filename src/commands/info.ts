import { Env } from '../types';
import { getOrCreateUser } from '../db/d1';
import { getUserModel, getDefaultModel } from '../db/kv';

export const infoCommand = {
  name: 'info',
  description: '查看用户信息',
  handler: async (env: Env, userId: string): Promise<string> => {
    const user = await getOrCreateUser(env.DB, userId);
    const model = await getUserModel(env.KV, userId) || await getDefaultModel(env.KV);

    return `用户信息：
ID：${user.user_id}
昵称：${user.nickname || '未设置'}
模型：${model}
注册时间：${new Date(user.created_at * 1000).toLocaleDateString('zh-CN')}`;
  },
};
