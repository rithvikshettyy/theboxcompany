import { removeDocument } from "@/lib/copilot/store";

/** DELETE /api/copilot/documents/:id removes a document and all its chunks. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return removeDocument(id) ? Response.json({ ok: true }) : Response.json({ error: "Document not found." }, { status: 404 });
}
