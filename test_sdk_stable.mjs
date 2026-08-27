import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, tool } from "ai";
import { z } from "zod";

const provider = createOpenAICompatible({ name: "bai", baseURL: "https://api.b.ai/v1", apiKey: "sk-12xmjqe6mk2qfn6lfghm8qvowmnq35ml" });

for (let i = 1; i <= 3; i++) {
  try {
    const result = await generateText({
      model: provider("deepseek-v4-flash"),
      system: "你是一个智能助手，可以调用工具。当用户询问实时信息时调用 web_search 工具。",
      prompt: "今天北京天气怎么样？",
      tools: {
        web_search: tool({ description: "搜索互联网获取最新信息", parameters: z.object({ query: z.string() }), execute: async ({ query }) => "搜索结果：北京晴 20度" }),
      },
    });
    const toolUsed = result.steps?.some(s => s.toolCalls?.length > 0);
    console.log(`[${i}] toolUsed=${toolUsed} text=${(result.text||"").slice(0,30)}`);
  } catch (e) {
    console.log(`[${i}] error=${e.message}`);
  }
  await new Promise(r => setTimeout(r, 1500));
}