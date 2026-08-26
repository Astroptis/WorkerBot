import { Env } from '../types';
import { helpCommand } from './help';
import { chatCommand } from './chat';
import { clearCommand } from './clear';
import { modelCommand } from './model';
import { infoCommand } from './info';

interface Command {
  name: string;
  description: string;
  handler: (env: Env, userId: string, args: string) => Promise<string>;
}

const commands: Record<string, Command> = {
  help: helpCommand,
  chat: chatCommand,
  clear: clearCommand,
  model: modelCommand,
  info: infoCommand,
};

export function isCommand(message: string): boolean {
  return message.startsWith('/');
}

export async function handleCommand(
  env: Env,
  userId: string,
  message: string
): Promise<string> {
  const parts = message.slice(1).split(/\s+/);
  const cmdName = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  const cmd = commands[cmdName];
  if (!cmd) {
    return `未知指令：/${cmdName}\n使用 /help 查看可用指令。`;
  }

  return cmd.handler(env, userId, args);
}
