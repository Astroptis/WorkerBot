export const helpCommand = {
  name: 'help',
  description: '显示帮助信息',
  handler: async (): Promise<string> => {
    return `可用指令：
/help - 显示此帮助信息
/chat [内容] - 显式对话
/clear - 清空对话历史
/model [模型名] - 查看/切换模型
/info - 查看用户信息

直接发送文字即可与 AI 对话。`;
  },
};
