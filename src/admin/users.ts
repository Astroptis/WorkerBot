import { Env } from '../types';
import { getAllUsers, getUser, getUserCount, getUserConversations } from '../db/d1';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleGetUsers(env: Env, url: URL): Promise<Response> {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const users = await getAllUsers(env.DB, limit, offset);
  const total = await getUserCount(env.DB);

  return jsonResponse({
    users,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}

export async function handleGetUser(env: Env, userId: string): Promise<Response> {
  const user = await getUser(env.DB, userId);
  if (!user) return jsonResponse({ error: 'User not found' }, 404);
  return jsonResponse({ user });
}

export async function handleGetUserConversations(env: Env, userId: string, url: URL): Promise<Response> {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const conversations = await getUserConversations(env.DB, userId, limit, offset);
  return jsonResponse({ conversations });
}