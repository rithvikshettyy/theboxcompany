import { SAMPLE_DOCS } from "@/lib/copilot/samples";
import { addDocument, load } from "@/lib/copilot/store";

/** POST /api/copilot/samples adds the demo documents that are not already in the knowledge base. */
export async function POST() {
  const have = new Set(load().docs.map((d) => d.name));
  const added = [];
  try {
    for (const s of SAMPLE_DOCS.filter((x) => !have.has(x.name))) {
      added.push(await addDocument({ name: s.name, kind: "txt", sizeBytes: s.pages.reduce((n, p) => n + p.text.length, 0), pages: s.pages, sample: true }));
    }
    return Response.json({ docs: added }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not add the samples." }, { status: 500 });
  }
}
