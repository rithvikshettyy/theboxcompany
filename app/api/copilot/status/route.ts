import { connection } from "next/server";
import { COPILOT } from "@/lib/assumptions";
import { llmConfigured } from "@/lib/copilot/chat";
import { embedderId } from "@/lib/copilot/embed";
import { load } from "@/lib/copilot/store";

/** GET /api/copilot/status says what is really connected, so the page never implies more than it has. */
export async function GET() {
  await connection();
  const d = load();
  return Response.json({
    llm: llmConfigured() ? "anthropic" : "demo",
    model: llmConfigured() ? (process.env.COPILOT_MODEL ?? COPILOT.model) : null,
    embedder: embedderId(),
    docs: d.docs.length,
    chunks: d.chunks.length,
    defaults: { topK: COPILOT.topK, topKMax: COPILOT.topKMax, threshold: COPILOT.threshold },
  });
}
