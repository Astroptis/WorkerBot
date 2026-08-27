import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, tool } from "ai";
import { z } from "zod";

// 用 fetch 拦截记录请求
const origFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const body = init?.body;
  console.log("=== REQUEST ===");
  console.log("URL:", url);
  console.log("HEADERS:", JSON.stringify(init?.headers));
  console.log("BODY:", typeof body === "string" ? body : JSON.stringify(body));
  console.log("=== END REQUEST ===");
  return origFetch(url, init);
};

const provider = createOpenAICompatible({ name: "bai", baseURL: "https://api.b.ai/v1", apiKey: "sk-12xmjqe6mk2qfn6lfghm8qvowmnq35ml" });
try {
  const r = await generateText({
    model: provider("deepseek-v4-flash"),
    system: "你是一个智能助手，可以调用工具。当用户询问实时信息时调用 web_search 工具。",
    prompt: "张雪峰老师最近的情况",
    tools: { web_search: tool({ description: "搜索", parameters: z.object({ query: z.string() }), execute: async () => "ok" }) },
  });
  console.log("RESULT:", r.text?.slice(0, 50));
} catch (e) { console.log("ERR:", e.message); }