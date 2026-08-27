import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";

const provider = createOpenAICompatible({ name: "bai", baseURL: "https://api.b.ai/v1", apiKey: "sk-12xmjqe6mk2qfn6lfghm8qvowmnq35ml" });
try {
  const r = await generateText({ model: provider("deepseek-v4-flash"), prompt: "hi", maxOutputTokens: 50 });
  console.log("OK:", r.text);
} catch (e) {
  console.log("ERR:", e.message);
  console.log("CAUSE:", JSON.stringify(e.cause || {}, null, 2));
}