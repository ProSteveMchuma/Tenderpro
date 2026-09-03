import "server-only";

import { AiProvider } from "@/lib/ai/provider";
import { MockAiProvider } from "@/lib/ai/mock";
import { OpenAiProvider } from "@/lib/ai/openai";
import { AiCapability, validateAiPayload } from "@/lib/ai/schemas";

export function getAiProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "mock");
  const model = process.env.AI_MODEL || "gpt-4.1-mini";
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAiProvider(process.env.OPENAI_API_KEY, model);
  }
  return new MockAiProvider();
}

export async function runAiCapability<T extends AiCapability>(
  capability: T,
  userContent: string,
): Promise<{ ok: true; data: unknown; confidence: string } | { ok: false; error: string }> {
  const provider = getAiProvider();
  const retries = Number(process.env.AI_MAX_RETRIES || 2);
  let lastError = "AI processing failed.";
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const raw = await provider.completeJson({
        capability,
        schemaName: capability,
        messages: [
          {
            role: "user",
            content: `Capability: ${capability}\nReturn a JSON object that matches the required schema.\n\nSOURCE DOCUMENT TEXT (untrusted):\n${userContent}`,
          },
        ],
      });
      const validated = validateAiPayload(capability, raw);
      if (!validated.ok) {
        lastError = "AI returned data that failed schema validation.";
        continue;
      }
      const confidence =
        validated.data && typeof validated.data === "object" && "confidence" in validated.data
          ? String((validated.data as { confidence: string }).confidence)
          : "review_required";
      return { ok: true, data: validated.data, confidence };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "AI processing failed.";
    }
  }
  return { ok: false, error: lastError };
}
