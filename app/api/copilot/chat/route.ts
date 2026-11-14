import { chat, parseChatRequest } from "@/lib/copilot/chat";

/** POST /api/copilot/chat streams newline-delimited JSON events: retrieval, delta..., done (or error). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const parsed = parseChatRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of chat(parsed.req, undefined, req.signal)) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      } catch (e) {
        controller.enqueue(encoder.encode(`${JSON.stringify({ t: "error", message: e instanceof Error ? e.message : "Something went wrong." })}\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
