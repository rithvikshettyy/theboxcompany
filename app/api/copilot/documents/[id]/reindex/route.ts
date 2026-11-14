import { reindexDocument } from "@/lib/copilot/store";

/** POST /api/copilot/documents/:id/reindex rebuilds one document's chunks and vectors from its stored text. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const doc = await reindexDocument(id);
    return doc ? Response.json({ doc }) : Response.json({ error: "Document not found." }, { status: 404 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Re-indexing failed." }, { status: 500 });
  }
}
