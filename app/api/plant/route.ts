import { build } from "@/lib/model";
import { isScope, SCOPES } from "@/lib/scope";
import type { PlantData, Scope } from "@/lib/types";

/** The model is deterministic, so each scope is worked out once per server process, not on every request. */
const cache = new Map<Scope, PlantData>();

/** GET /api/plant?scope=A|B|C|today|7d|30d → PlantData for that scope. */
export function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope");
  if (!isScope(scope)) {
    return Response.json(
      { error: `Unknown scope "${scope ?? ""}". Use one of ${SCOPES.join(", ")}.` },
      { status: 400 },
    );
  }
  let data = cache.get(scope);
  if (!data) {
    data = build(scope);
    cache.set(scope, data);
  }
  return Response.json(data);
}
