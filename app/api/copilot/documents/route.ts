import { COPILOT } from "@/lib/assumptions";
import { ExtractError, extractFile } from "@/lib/copilot/extract";
import { addDocument, load } from "@/lib/copilot/store";

/** GET /api/copilot/documents?q= lists documents, optionally filtered by name or content. */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const d = load();
  const docs = q
    ? d.docs.filter((x) => x.name.toLowerCase().includes(q) || (d.pages[x.id] ?? []).some((p) => p.text.toLowerCase().includes(q)))
    : d.docs;
  return Response.json({ docs: docs.slice().sort((a, b) => b.uploadedAt - a.uploadedAt) });
}

/** POST multipart "file": extract, chunk, embed and store one document. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Send the file as multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file was sent." }, { status: 400 });
  if (file.size > COPILOT.maxFileBytes) return Response.json({ error: `The file is over ${COPILOT.maxFileBytes / 1024 / 1024} MB.` }, { status: 413 });
  try {
    const { name, kind, pages } = await extractFile(file.name, new Uint8Array(await file.arrayBuffer()));
    const doc = await addDocument({ name, kind, sizeBytes: file.size, pages });
    return Response.json({ doc }, { status: 201 });
  } catch (e) {
    if (e instanceof ExtractError) return Response.json({ error: e.message }, { status: 422 });
    return Response.json({ error: e instanceof Error ? e.message : "The document could not be processed." }, { status: 500 });
  }
}
